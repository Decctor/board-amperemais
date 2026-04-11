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
} from "@/lib/campaigns/validation";
import { parseTemplateVariables } from "@/lib/ai-agent/marketing/template-variables";
import { fetchAndUploadToMeta, isMediaHeaderType } from "@/lib/whatsapp/media-upload";
import { createWhatsappTemplate as createWhatsappTemplateInMeta } from "@/lib/whatsapp/template-management";
import { AIHintSchema, ApproveHintOutputSchema, type TAIHint, type TApproveHintInput, type TApproveHintOutput } from "@/schemas/ai-hints";
import { CampaignSchema } from "@/schemas/campaigns";
import { type TWhatsappTemplate, type TWhatsappTemplateBodyParameter, type TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";
import { db } from "@/services/drizzle";
import { aiHints, campaignSegmentations, campaigns, whatsappTemplatePhones, whatsappTemplates } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";

type TWhatsappTemplatePayload = Omit<TWhatsappTemplate, "autorId" | "dataInsercao">;

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

function buildBodyParameters(templateText: string): TWhatsappTemplateBodyParameter[] {
	const { variables, unknownVariables } = parseTemplateVariables(templateText);
	if (unknownVariables.length > 0) {
		throw new createHttpError.BadRequest(`Variáveis desconhecidas no template: ${unknownVariables.join(", ")}.`);
	}

	return variables.map((variable, index) => ({
		nome: String(index + 1),
		identificador: variable.identificador,
		exemplo: variable.identificador,
	}));
}

function buildTemplateComponentsFromSuggestion({
	bodyText,
	baseComponents,
}: {
	bodyText: string;
	baseComponents?: TWhatsappTemplateComponents | null;
}): TWhatsappTemplateComponents {
	return {
		cabecalho: baseComponents?.cabecalho ?? null,
		corpo: {
			conteudo: bodyText,
			parametros: buildBodyParameters(bodyText),
		},
		rodape: baseComponents?.rodape ?? null,
		botoes: baseComponents?.botoes ?? null,
	};
}

function validatePermanenciaSegmentacaoRequirement(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.gatilhoTipo === "PERMANÊNCIA-SEGMENTAÇÃO" && (!campaign.gatilhoTempoPermanenciaMedida || !campaign.gatilhoTempoPermanenciaValor)) {
		throw new createHttpError.BadRequest("Defina um tempo de permanência para a segmentação.");
	}
}

async function resolveTemplateMediaHeaderForMeta({
	template,
	whatsappToken,
	logScope,
}: {
	template: TWhatsappTemplatePayload;
	whatsappToken: string;
	logScope: string;
}) {
	const header = template.componentes.cabecalho;
	if (!header || !isMediaHeaderType(header.tipo) || !header.conteudo) {
		return template;
	}

	const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
	if (!metaAppId) {
		throw new createHttpError.InternalServerError("Meta app ID não configurado.");
	}

	try {
		const { headerHandle } = await fetchAndUploadToMeta({
			fileUrl: header.conteudo,
			appId: metaAppId,
			accessToken: whatsappToken,
		});

		console.log(`[INFO] [${logScope}] Media uploaded successfully. Header handle: ${headerHandle}`);

		return {
			...template,
			componentes: {
				...template.componentes,
				cabecalho: {
					...header,
					exemplo: headerHandle,
				},
			},
		};
	} catch (uploadError) {
		console.error(`[ERROR] [${logScope}] Failed to upload media to Meta:`, uploadError);
		throw new createHttpError.BadRequest(
			`Erro ao fazer upload da mídia para o WhatsApp: ${uploadError instanceof Error ? uploadError.message : "Erro desconhecido"}`,
		);
	}
}

async function createTemplateRegistry({
	organizationId,
	userId,
	template,
}: {
	organizationId: string;
	userId: string;
	template: TWhatsappTemplatePayload;
}) {
	const orgWhatsappConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
		with: {
			telefones: true,
		},
	});
	if (!orgWhatsappConnection) throw new createHttpError.NotFound("Conexão WhatsApp não encontrada.");
	if (orgWhatsappConnection.telefones.length === 0) throw new createHttpError.NotFound("Nenhum telefone cadastrado na conexão WhatsApp.");

	const [insertedTemplate] = await db
		.insert(whatsappTemplates)
		.values({
			nome: template.nome,
			categoria: template.categoria,
			componentes: template.componentes,
			autorId: userId,
			organizacaoId: organizationId,
		})
		.returning({ id: whatsappTemplates.id });

	if (!insertedTemplate) throw new createHttpError.InternalServerError("Erro ao criar template.");

	const connectionType = orgWhatsappConnection.tipoConexao;
	const whatsappToken = orgWhatsappConnection.token;
	const phoneResults: Array<{ telefoneId: string; whatsappTemplateId: string | null; error?: string }> = [];

	for (const telefone of orgWhatsappConnection.telefones) {
		try {
			let metaWhatsappTemplateId: string | null = null;
			if (connectionType === "META_CLOUD_API" && whatsappToken) {
				if (!telefone.whatsappBusinessAccountId) continue;

				const templateForMeta = await resolveTemplateMediaHeaderForMeta({
					template,
					whatsappToken,
					logScope: "AI_HINT_APPROVE_TEMPLATE_CREATE",
				});

				const metaResponse = await createWhatsappTemplateInMeta({
					whatsappToken,
					whatsappBusinessAccountId: telefone.whatsappBusinessAccountId,
					template: templateForMeta,
				});
				metaWhatsappTemplateId = metaResponse.whatsappTemplateId;
			}

			await db.insert(whatsappTemplatePhones).values({
				templateId: insertedTemplate.id,
				telefoneId: telefone.id,
				whatsappTemplateId: metaWhatsappTemplateId,
				status: metaWhatsappTemplateId ? "PENDENTE" : "APROVADO",
				qualidade: metaWhatsappTemplateId ? "PENDENTE" : "ALTA",
			});

			phoneResults.push({
				telefoneId: telefone.id,
				whatsappTemplateId: metaWhatsappTemplateId,
			});
		} catch (error) {
			console.error(`[ERROR] [AI_HINT_APPROVE_TEMPLATE_CREATE] Failed for phone ${telefone.numero}:`, error);
			phoneResults.push({
				telefoneId: telefone.id,
				whatsappTemplateId: null,
				error: error instanceof Error ? error.message : "Erro desconhecido",
			});
		}
	}

	const successfulPhones = phoneResults.filter((result) => result.whatsappTemplateId !== null);
	const failedPhones = phoneResults.filter((result) => result.whatsappTemplateId === null);

	if (connectionType === "META_CLOUD_API" && successfulPhones.length === 0 && failedPhones.length > 0) {
		throw new createHttpError.BadRequest(failedPhones[0]?.error || "Erro ao criar template no WhatsApp.");
	}

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

	const templatePayload: TWhatsappTemplatePayload = {
		nome: buildUniqueTemplateName(suggestion.titulo),
		categoria: "MARKETING",
		componentes: buildTemplateComponentsFromSuggestion({
			bodyText: suggestion.whatsappTemplateText,
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
		await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, templateId));
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
	if (!existingCampaign.whatsappTemplate) throw new createHttpError.NotFound("Template do WhatsApp da campanha não encontrado.");

	const currentCampaign = CampaignSchema.omit({ dataInsercao: true, autorId: true }).parse(existingCampaign);
	const effectiveCampaign = CampaignSchema.omit({ dataInsercao: true, autorId: true }).parse({
		...currentCampaign,
		...suggestion.proposedChanges,
		whatsappTemplateId: "placeholder",
	});

	validatePermanenciaSegmentacaoRequirement({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });
	validateRecurrentCampaign({ ...effectiveCampaign, autorId: session.user.id, dataInsercao: new Date() });
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

	const templatePayload: TWhatsappTemplatePayload = {
		nome: buildUniqueTemplateName(existingCampaign.whatsappTemplate.nome),
		categoria: existingCampaign.whatsappTemplate.categoria,
		componentes: buildTemplateComponentsFromSuggestion({
			bodyText: suggestion.whatsappTemplateText,
			baseComponents: existingCampaign.whatsappTemplate.componentes,
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
		await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, templateId));
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
