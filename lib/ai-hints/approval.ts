import {
	applyWhatsappSubmissionResultToMetadata,
	assertWhatsappValidation,
	createEmptyMessageTemplateMetadata,
	getOrganizationWhatsappPhones,
	normalizeContentForStorage,
	submitMessageTemplateToWhatsappPhone,
} from "@/app/api/message-templates/_lib";
import type { TAuthUserSession } from "@/lib/authentication/types";
import {
	getEffectiveCampaignWeeklyLimit,
	getOrganizationWeeklyCampaignLimit,
	validateCampaignCashbackGeneration,
	validateCampaignFrequencyInterval,
	validateCampaignTemplateTriggerCompatibility,
	validateCashbackExpiringTrigger,
	validateExecutionDelayDirection,
	validateRecurrentCampaign,
	validateSingleUseCampaign,
} from "@/lib/campaigns/validation";
import { extractUnknownMessageTemplateVariables, normalizeMessageTemplateContentParameters } from "@/lib/message-templates";
import { AIHintSchema, ApproveHintOutputSchema, type TAIHint, type TApproveHintInput, type TApproveHintOutput } from "@/schemas/ai-hints";
import { CampaignSchema } from "@/schemas/campaigns";
import type { TMessageTemplateContent } from "@/schemas/message-templates";
import { db } from "@/services/drizzle";
import { aiHints, campaignSegmentations, campaigns, messageTemplates } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";

type TMessageTemplatePayload = {
	nome: string;
	categoria: "MARKETING";
	conteudo: TMessageTemplateContent;
};

function sanitizeTemplateNamePart(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 80);
}

function buildUniqueTemplateName(base: string) {
	const sanitized = sanitizeTemplateNamePart(base) || "template";
	const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
	return `ai_hint_${sanitized}_${suffix}`.slice(0, 512);
}

function buildMessageTemplateContentFromSuggestion({
	bodyText,
	subject,
	preheader,
	baseContent,
}: {
	bodyText: string;
	subject: string;
	preheader: string;
	baseContent?: TMessageTemplateContent | null;
}): TMessageTemplateContent {
	const unknownVariables = extractUnknownMessageTemplateVariables([bodyText]);
	if (unknownVariables.length > 0) {
		throw new createHttpError.BadRequest(`Variáveis desconhecidas no template: ${unknownVariables.join(", ")}.`);
	}

	return normalizeMessageTemplateContentParameters({
		assunto: baseContent?.assunto?.trim() || subject,
		preheader: baseContent?.preheader?.trim() || preheader,
		cabecalho: baseContent?.cabecalho ?? null,
		corpo: {
			conteudo: bodyText,
			parametros: baseContent?.corpo.parametros ?? [],
		},
		rodape: baseContent?.rodape ?? null,
		botoes: baseContent?.botoes ?? [],
	});
}

function validatePermanenciaSegmentacaoRequirement(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.gatilhoTipo === "PERMANÊNCIA-SEGMENTAÇÃO" && (!campaign.gatilhoTempoPermanenciaMedida || !campaign.gatilhoTempoPermanenciaValor)) {
		throw new createHttpError.BadRequest("Defina um tempo de permanência para a segmentação.");
	}
}

async function createTemplateRegistry({
	organizationId,
	userId,
	template,
}: {
	organizationId: string;
	userId: string;
	template: TMessageTemplatePayload;
}) {
	const content = normalizeContentForStorage(template.conteudo);
	assertWhatsappValidation(content);

	const [insertedTemplate] = await db
		.insert(messageTemplates)
		.values({
			nome: template.nome,
			categoria: template.categoria,
			status: "ATIVO",
			alerta: null,
			metadados: createEmptyMessageTemplateMetadata(),
			conteudo: content,
			linguagem: "pt_BR",
			autorId: userId,
			organizacaoId: organizationId,
		})
		.returning();

	if (!insertedTemplate) throw new createHttpError.InternalServerError("Erro ao criar template.");

	const phones = await getOrganizationWhatsappPhones(organizationId);
	let nextMetadata = insertedTemplate.metadados;
	let nextContent = insertedTemplate.conteudo;
	const phoneResults: Array<{ telefoneId: string; whatsappTemplateId: string | null; error?: string }> = [];

	for (const phone of phones) {
		try {
			const result = await submitMessageTemplateToWhatsappPhone({
				template: { ...insertedTemplate, metadados: nextMetadata, conteudo: nextContent },
				phone,
				organizationId,
				origin: "ai_hint",
				mode: "create",
			});
			nextMetadata = applyWhatsappSubmissionResultToMetadata({
				metadata: nextMetadata,
				phoneId: phone.id,
				idExterno: result.idExterno,
			});
			if (result.content) nextContent = result.content;
			phoneResults.push({
				telefoneId: phone.id,
				whatsappTemplateId: result.idExterno,
				error: result.success ? undefined : result.message,
			});
		} catch (error) {
			console.error(`[ERROR] [AI_HINT_APPROVE_TEMPLATE_CREATE] Failed for phone ${phone.numero}:`, error);
			phoneResults.push({
				telefoneId: phone.id,
				whatsappTemplateId: null,
				error: error instanceof Error ? error.message : "Erro desconhecido",
			});
		}
	}

	await db
		.update(messageTemplates)
		.set({
			metadados: nextMetadata,
			conteudo: nextContent,
			dataAtualizacao: new Date(),
		})
		.where(eq(messageTemplates.id, insertedTemplate.id));

	return {
		templateId: insertedTemplate.id,
		phoneResults,
	};
}

async function getHintForApproval({ organizationId, hintId }: { organizationId: string; hintId: string }): Promise<TAIHint> {
	const hint = await db.query.aiHints.findFirst({
		where: and(eq(aiHints.id, hintId), eq(aiHints.organizacaoId, organizationId)),
	});

	if (!hint) throw new createHttpError.NotFound("Dica não encontrada.");
	if (hint.dataAprovacao) throw new createHttpError.BadRequest("Esta dica já foi aprovada.");
	if (hint.status !== "active") throw new createHttpError.BadRequest("Esta dica não está ativa para aprovação.");
	if (hint.dataExpiracao && hint.dataExpiracao < new Date()) {
		throw new createHttpError.BadRequest("Esta dica expirou e não pode mais ser aprovada.");
	}

	return AIHintSchema.parse(hint);
}

async function createCampaignFromApprovedHint({
	hint,
	session,
	organizationId,
}: {
	hint: TAIHint;
	session: TAuthUserSession;
	organizationId: string;
}) {
	if (hint.conteudo.tipo !== "campaign-creation-suggestion") {
		throw new createHttpError.BadRequest("Tipo de dica não suportado para criação.");
	}
	const suggestion = hint.conteudo.dados.sugestao;
	const campaign = CampaignSchema.omit({ dataInsercao: true, autorId: true }).parse({
		...suggestion,
		whatsappTemplateId: "placeholder",
	});

	validatePermanenciaSegmentacaoRequirement({ ...campaign, autorId: session.user.id, dataInsercao: new Date() });
	validateRecurrentCampaign({ ...campaign, autorId: session.user.id, dataInsercao: new Date() });
	validateSingleUseCampaign({ ...campaign, autorId: session.user.id, dataInsercao: new Date() });
	validateCashbackExpiringTrigger({ ...campaign, autorId: session.user.id, dataInsercao: new Date() });
	validateCampaignFrequencyInterval({ ...campaign, autorId: session.user.id, dataInsercao: new Date() });
	validateExecutionDelayDirection({ ...campaign, autorId: session.user.id, dataInsercao: new Date() });
	validateCampaignCashbackGeneration({ ...campaign, autorId: session.user.id, dataInsercao: new Date() });

	const organizationWeeklyLimit = await getOrganizationWeeklyCampaignLimit(organizationId);
	getEffectiveCampaignWeeklyLimit({
		organizationWeeklyLimit,
		campaignWeeklyLimit: campaign.limiteEnviosSemanais,
		operation: "CREATE",
		organizationId,
	});

	const templatePayload: TMessageTemplatePayload = {
		nome: buildUniqueTemplateName(suggestion.titulo),
		categoria: "MARKETING",
		conteudo: buildMessageTemplateContentFromSuggestion({
			bodyText: suggestion.messageTemplateText,
			subject: suggestion.titulo,
			preheader: suggestion.objetivoEsperado || suggestion.descricao || "Mensagem da campanha",
		}),
	};

	const { templateId } = await createTemplateRegistry({
		organizationId,
		userId: session.user.id,
		template: templatePayload,
	});

	try {
		await validateCampaignTemplateTriggerCompatibility(templateId, campaign.gatilhoTipo);

		const [insertedCampaign] = await db
			.insert(campaigns)
			.values({
				...campaign,
				organizacaoId: organizationId,
				autorId: session.user.id,
				whatsappTemplateId: templateId,
			})
			.returning({ id: campaigns.id });

		if (!insertedCampaign) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar campanha.");

		if (suggestion.segmentations.length > 0) {
			await db.insert(campaignSegmentations).values(
				suggestion.segmentations.map((segmentation) => ({
					organizacaoId: organizationId,
					campanhaId: insertedCampaign.id,
					segmentacao: segmentation,
				})),
			);
		}

		return {
			operation: "campaign-created" as const,
			campaignId: insertedCampaign.id,
			whatsappTemplateId: templateId,
		};
	} catch (error) {
		await db.delete(messageTemplates).where(eq(messageTemplates.id, templateId));
		throw error;
	}
}

async function updateCampaignFromApprovedHint({
	hint,
	session,
	organizationId,
}: {
	hint: TAIHint;
	session: TAuthUserSession;
	organizationId: string;
}) {
	if (hint.conteudo.tipo !== "campaign-updates-suggestion") {
		throw new createHttpError.BadRequest("Tipo de dica não suportado para atualização.");
	}
	const suggestion = hint.conteudo.dados.sugestao;
	const existingCampaign = await db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, suggestion.campaignId), eq(campaigns.organizacaoId, organizationId)),
		with: {
			segmentacoes: true,
			whatsappTemplate: true,
		},
	});

	if (!existingCampaign) throw new createHttpError.NotFound("Campanha da sugestão não encontrada.");
	if (!existingCampaign.whatsappTemplate) throw new createHttpError.NotFound("Template de mensagem da campanha não encontrado.");

	const currentCampaign = CampaignSchema.omit({ dataInsercao: true, autorId: true }).parse(existingCampaign);
	const effectiveCampaign = CampaignSchema.omit({ dataInsercao: true, autorId: true }).parse({
		...currentCampaign,
		...suggestion.proposedChanges,
		whatsappTemplateId: "placeholder",
	});

	validatePermanenciaSegmentacaoRequirement({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });
	validateRecurrentCampaign({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });
	validateSingleUseCampaign({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });
	validateCashbackExpiringTrigger({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });
	validateCampaignFrequencyInterval({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });
	validateExecutionDelayDirection({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });
	validateCampaignCashbackGeneration({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });

	const organizationWeeklyLimit = await getOrganizationWeeklyCampaignLimit(organizationId);
	getEffectiveCampaignWeeklyLimit({
		organizationWeeklyLimit,
		campaignWeeklyLimit: effectiveCampaign.limiteEnviosSemanais,
		operation: "UPDATE",
		campaignId: existingCampaign.id,
		organizationId,
	});

	const templatePayload: TMessageTemplatePayload = {
		nome: buildUniqueTemplateName(existingCampaign.whatsappTemplate.nome),
		categoria: "MARKETING",
		conteudo: buildMessageTemplateContentFromSuggestion({
			bodyText: suggestion.messageTemplateText,
			subject: suggestion.campaignTitle,
			preheader: suggestion.impactoEsperado || suggestion.justificativa || "Atualização da campanha",
			baseContent: existingCampaign.whatsappTemplate.conteudo,
		}),
	};

	const { templateId } = await createTemplateRegistry({
		organizationId,
		userId: session.user.id,
		template: templatePayload,
	});

	try {
		await validateCampaignTemplateTriggerCompatibility(templateId, effectiveCampaign.gatilhoTipo);

		await db
			.update(campaigns)
			.set({
				...effectiveCampaign,
				organizacaoId: organizationId,
				whatsappTemplateId: templateId,
			})
			.where(and(eq(campaigns.id, existingCampaign.id), eq(campaigns.organizacaoId, organizationId)));

		await db.delete(campaignSegmentations).where(eq(campaignSegmentations.campanhaId, existingCampaign.id));

		if (suggestion.segmentations.length > 0) {
			await db.insert(campaignSegmentations).values(
				suggestion.segmentations.map((segmentacao) => ({
					organizacaoId: organizationId,
					campanhaId: existingCampaign.id,
					segmentacao,
				})),
			);
		}

		return {
			operation: "campaign-updated" as const,
			campaignId: existingCampaign.id,
			whatsappTemplateId: templateId,
		};
	} catch (error) {
		await db.delete(messageTemplates).where(eq(messageTemplates.id, templateId));
		throw error;
	}
}

export async function approveHint({ input, session }: { input: TApproveHintInput; session: TAuthUserSession }): Promise<TApproveHintOutput> {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) {
		throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	}

	const hint = await getHintForApproval({
		organizationId,
		hintId: input.id,
	});
	console.log("[INFO] Hint found", hint);
	const result =
		hint.conteudo.tipo === "campaign-creation-suggestion"
			? await createCampaignFromApprovedHint({ hint, session, organizationId })
			: await updateCampaignFromApprovedHint({ hint, session, organizationId });
	console.log("[INFO] Result from creating/updating the suggestion:", result);
	await db
		.update(aiHints)
		.set({
			aprovadaPor: session.user.id,
			dataAprovacao: new Date(),
		})
		.where(and(eq(aiHints.id, hint.id), eq(aiHints.organizacaoId, organizationId)));

	return ApproveHintOutputSchema.parse({
		data: {
			hintId: hint.id,
			operation: result.operation,
			campaignId: result.campaignId,
			whatsappTemplateId: result.whatsappTemplateId,
			templateOperation: "created",
		},
		message:
			result.operation === "campaign-created"
				? "Sugestão aprovada e campanha criada com sucesso."
				: "Sugestão aprovada e campanha atualizada com sucesso.",
	});
}
