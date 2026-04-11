import { CampaignSchema } from "@/schemas/campaigns";
import { db } from "@/services/drizzle";
import { campaigns, organizations, whatsappConnectionPhones } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";
import type { TCampaignTriggerTypeEnum } from "@/schemas/enums";
import {
	CampaignCreationSuggestionSchema,
	CampaignCurrentSummarySchema,
	CampaignUpdateProposedChangesSchema,
	CampaignUpdateSuggestionSchema,
	type TCampaignCreationSuggestion,
	type TCampaignCurrentSummary,
	type TCampaignUpdateProposedChanges,
	type TCampaignUpdateSuggestion,
} from "./schemas";
import { getWhatsappTemplatePlainText } from "./template-text";
import { validateTemplateVariablesForTrigger } from "./template-variables";

const TRIGGERS_SUPPORTING_ANTES: TCampaignTriggerTypeEnum[] = ["ANIVERSARIO_CLIENTE", "PIOR-DIA-VENDAS"];
const TEMPLATE_BODY_SECTION_PATTERN =
	/(?:^|\n)\s*(?:corpo|body)\s*:\s*\n?([\s\S]*?)(?=\n\s*(?:cabeçalho(?:\s*\([^)]+\))?|header(?:\s*\([^)]+\))?|rodapé|footer|bot(?:õ|o)es?|buttons?)\s*:|$)/i;
const TEMPLATE_NON_BODY_SECTION_PATTERN =
	/(^|\n)\s*(?:cabeçalho(?:\s*\([^)]+\))?|header(?:\s*\([^)]+\))?|rodapé|footer|bot(?:õ|o)es?|buttons?)\s*:/i;

function validateRecurrentCampaign(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.gatilhoTipo !== "RECORRENTE") return;

	if (!campaign.recorrenciaTipo) {
		throw new createHttpError.BadRequest("Selecione a frequência de recorrência da campanha.");
	}

	if (campaign.recorrenciaTipo === "SEMANAL") {
		if (!campaign.recorrenciaDiasSemana) {
			throw new createHttpError.BadRequest("Informe os dias da semana para a recorrência.");
		}

		const dias = JSON.parse(campaign.recorrenciaDiasSemana) as number[];
		if (!Array.isArray(dias) || dias.length === 0 || dias.some((dia) => dia < 0 || dia > 6)) {
			throw new createHttpError.BadRequest("Dias da semana inválidos para a recorrência.");
		}
	}

	if (campaign.recorrenciaTipo === "MENSAL") {
		if (!campaign.recorrenciaDiasMes) {
			throw new createHttpError.BadRequest("Informe os dias do mês para a recorrência.");
		}

		const dias = JSON.parse(campaign.recorrenciaDiasMes) as number[];
		if (!Array.isArray(dias) || dias.length === 0 || dias.some((dia) => dia < 1 || dia > 31)) {
			throw new createHttpError.BadRequest("Dias do mês inválidos para a recorrência.");
		}
	}
}

function validateCampaignFrequencyInterval(campaign: z.infer<typeof CampaignSchema>) {
	if (!campaign.permitirRecorrencia) return;

	if (!campaign.frequenciaIntervaloMedida || !campaign.frequenciaIntervaloValor || campaign.frequenciaIntervaloValor <= 0) {
		throw new createHttpError.BadRequest("A frequência mínima entre interações deve ser maior que zero.");
	}
}

function validateExecutionDelayDirection(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.execucaoAgendadaDirecao === "ANTES" && !TRIGGERS_SUPPORTING_ANTES.includes(campaign.gatilhoTipo)) {
		throw new createHttpError.BadRequest("A direção ANTES só é suportada por gatilhos específicos.");
	}
}

function validateCashbackExpiringTrigger(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.gatilhoTipo !== "CASHBACK-EXPIRANDO") return;

	if (
		!campaign.gatilhoCashbackExpirandoAntecedenciaMedida ||
		!campaign.gatilhoCashbackExpirandoAntecedenciaValor ||
		campaign.gatilhoCashbackExpirandoAntecedenciaValor <= 0
	) {
		throw new createHttpError.BadRequest("Informe uma antecedência válida para campanhas de cashback expirando.");
	}
}

function validateCashbackGeneration(campaign: z.infer<typeof CampaignSchema>) {
	if (!campaign.cashbackGeracaoAtivo) return;

	if (!campaign.cashbackGeracaoTipo) {
		throw new createHttpError.BadRequest("Selecione o tipo de geração de cashback.");
	}

	if (!campaign.cashbackGeracaoValor || campaign.cashbackGeracaoValor <= 0) {
		throw new createHttpError.BadRequest("Informe um valor válido para geração de cashback.");
	}

	if (campaign.cashbackGeracaoTipo === "PERCENTUAL") {
		const validTriggersForPercentual = ["NOVA-COMPRA", "PRIMEIRA-COMPRA"];
		if (!validTriggersForPercentual.includes(campaign.gatilhoTipo)) {
			throw new createHttpError.BadRequest("Cashback percentual só é aceito em gatilhos de compra.");
		}
	}
}

async function ensureWhatsappPhoneBelongsToOrganization(orgId: string, whatsappConexaoTelefoneId: string) {
	const phone = await db.query.whatsappConnectionPhones.findFirst({
		where: eq(whatsappConnectionPhones.id, whatsappConexaoTelefoneId),
		with: {
			conexao: true,
		},
	});

	if (!phone || phone.conexao.organizacaoId !== orgId) {
		throw new createHttpError.BadRequest("Telefone de WhatsApp não encontrado para a organização.");
	}

	return phone;
}

function validateTemplateTextForTrigger(templateText: string, triggerType: TCampaignTriggerTypeEnum) {
	const validation = validateTemplateVariablesForTrigger(templateText, triggerType);
	if (validation.unknownVariables.length > 0) {
		throw new createHttpError.BadRequest(`Variáveis desconhecidas no template: ${validation.unknownVariables.join(", ")}.`);
	}

	if (validation.incompatibleVariables.length > 0) {
		throw new createHttpError.BadRequest(`Variáveis incompatíveis com o gatilho: ${validation.incompatibleVariables.join(", ")}.`);
	}
}

function normalizeSuggestedWhatsappTemplateText(templateText: string) {
	const trimmedTemplateText = templateText.trim();
	const bodySectionMatch = trimmedTemplateText.match(TEMPLATE_BODY_SECTION_PATTERN);
	if (bodySectionMatch?.[1]?.trim()) {
		return bodySectionMatch[1].trim();
	}

	return trimmedTemplateText;
}

function validateSuggestedWhatsappTemplateText(templateText: string) {
	if (TEMPLATE_NON_BODY_SECTION_PATTERN.test(templateText)) {
		throw new createHttpError.BadRequest(
			"O campo whatsappTemplateText deve conter apenas o corpo da mensagem, sem cabeçalho, rodapé, botões ou outras seções estruturais.",
		);
	}
}

function validateCampaignRules(campaign: z.infer<typeof CampaignSchema>) {
	validateRecurrentCampaign(campaign);
	validateCampaignFrequencyInterval(campaign);
	validateExecutionDelayDirection(campaign);
	validateCashbackExpiringTrigger(campaign);
	validateCashbackGeneration(campaign);
}

export async function normalizeCampaignCreationSuggestion({
	organizacaoId,
	suggestion,
}: {
	organizacaoId: string;
	suggestion: TCampaignCreationSuggestion;
}) {
	const parsedSuggestion = CampaignCreationSuggestionSchema.parse(suggestion);
	await ensureWhatsappPhoneBelongsToOrganization(organizacaoId, parsedSuggestion.whatsappConexaoTelefoneId);
	const normalizedWhatsappTemplateText = normalizeSuggestedWhatsappTemplateText(parsedSuggestion.whatsappTemplateText);
	validateSuggestedWhatsappTemplateText(parsedSuggestion.whatsappTemplateText);
	validateTemplateTextForTrigger(normalizedWhatsappTemplateText, parsedSuggestion.gatilhoTipo);

	const campaignValidationShape = CampaignSchema.omit({
		autorId: true,
		dataInsercao: true,
		whatsappTemplateId: true,
	}).parse(parsedSuggestion);
	validateCampaignRules({
		...campaignValidationShape,
		autorId: "ai-agent",
		dataInsercao: new Date(),
		whatsappTemplateId: "ai-agent-template",
	});

	return {
		...parsedSuggestion,
		segmentations: Array.from(new Set(parsedSuggestion.segmentations.map((segmentation) => segmentation.trim()).filter(Boolean))),
		whatsappTemplateText: normalizedWhatsappTemplateText,
		justificativa: parsedSuggestion.justificativa.trim(),
		objetivoEsperado: parsedSuggestion.objetivoEsperado?.trim() || null,
	};
}

export async function buildCampaignCurrentSummary({
	organizacaoId,
	campaignId,
}: {
	organizacaoId: string;
	campaignId: string;
}): Promise<TCampaignCurrentSummary> {
	const campaign = await db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, campaignId), eq(campaigns.organizacaoId, organizacaoId)),
		with: {
			segmentacoes: true,
			whatsappTemplate: true,
		},
	});

	if (!campaign) {
		throw new createHttpError.NotFound("Campanha não encontrada.");
	}

	return CampaignCurrentSummarySchema.parse({
		id: campaign.id,
		titulo: campaign.titulo,
		descricao: campaign.descricao,
		gatilhoTipo: campaign.gatilhoTipo,
		ativo: campaign.ativo,
		segmentations: campaign.segmentacoes.map((item) => item.segmentacao),
		whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId,
		whatsappTemplateText: campaign.whatsappTemplate ? getWhatsappTemplatePlainText(campaign.whatsappTemplate.componentes) : null,
	});
}

async function getExistingCampaignEditableConfig({
	organizacaoId,
	campaignId,
}: {
	organizacaoId: string;
	campaignId: string;
}) {
	const campaign = await db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, campaignId), eq(campaigns.organizacaoId, organizacaoId)),
	});

	if (!campaign) {
		throw new createHttpError.NotFound("Campanha não encontrada.");
	}

	return CampaignSchema.omit({
		autorId: true,
		dataInsercao: true,
		whatsappTemplateId: true,
	}).parse(campaign);
}

export async function normalizeCampaignUpdateSuggestion({
	organizacaoId,
	suggestion,
}: {
	organizacaoId: string;
	suggestion: TCampaignUpdateSuggestion;
}) {
	const parsedSuggestion = CampaignUpdateSuggestionSchema.parse(suggestion);
	const currentSummary = await buildCampaignCurrentSummary({
		organizacaoId,
		campaignId: parsedSuggestion.campaignId,
	});
	const currentConfig = await getExistingCampaignEditableConfig({
		organizacaoId,
		campaignId: parsedSuggestion.campaignId,
	});

	const parsedChanges = CampaignUpdateProposedChangesSchema.parse(parsedSuggestion.proposedChanges) as TCampaignUpdateProposedChanges;
	const effectiveTriggerType = parsedChanges.gatilhoTipo ?? currentSummary.gatilhoTipo;
	const effectiveWhatsappPhoneId = parsedChanges.whatsappConexaoTelefoneId ?? currentSummary.whatsappConexaoTelefoneId;
	if (!effectiveWhatsappPhoneId) {
		throw new createHttpError.BadRequest("A campanha precisa ter um telefone de WhatsApp definido.");
	}

	await ensureWhatsappPhoneBelongsToOrganization(organizacaoId, effectiveWhatsappPhoneId);
	const normalizedWhatsappTemplateText = normalizeSuggestedWhatsappTemplateText(parsedSuggestion.whatsappTemplateText);
	validateSuggestedWhatsappTemplateText(parsedSuggestion.whatsappTemplateText);
	validateTemplateTextForTrigger(normalizedWhatsappTemplateText, effectiveTriggerType);

	const campaignValidationShape = CampaignSchema.omit({
		autorId: true,
		dataInsercao: true,
		whatsappTemplateId: true,
	}).parse({
		...currentConfig,
		...parsedChanges,
		titulo: parsedChanges.titulo ?? currentConfig.titulo,
		descricao: parsedChanges.descricao ?? currentConfig.descricao,
		gatilhoTipo: effectiveTriggerType,
		whatsappConexaoTelefoneId: effectiveWhatsappPhoneId,
	});

	validateCampaignRules({
		...campaignValidationShape,
		autorId: "ai-agent",
		dataInsercao: new Date(),
		whatsappTemplateId: "ai-agent-template",
	});

	return {
		...parsedSuggestion,
		campaignTitle: parsedSuggestion.campaignTitle.trim(),
		currentSummary,
		currentConfig,
		proposedChanges: parsedChanges,
		segmentations: Array.from(new Set(parsedSuggestion.segmentations.map((segmentation) => segmentation.trim()).filter(Boolean))),
		whatsappTemplateText: normalizedWhatsappTemplateText,
		justificativa: parsedSuggestion.justificativa.trim(),
		impactoEsperado: parsedSuggestion.impactoEsperado?.trim() || null,
	};
}

export async function ensureOrganizationExists(organizacaoId: string) {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizacaoId),
		columns: {
			id: true,
		},
	});

	if (!organization) {
		throw new createHttpError.NotFound("Organização não encontrada.");
	}

	return organization;
}
