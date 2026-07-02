import { validateTemplateForTrigger } from "@/lib/message-templates";
import { db } from "@/services/drizzle";
import { type TCampaignTriggerTypeEnum } from "@/schemas/enums";
import { CampaignSchema } from "@/schemas/campaigns";
import createHttpError from "http-errors";
import dayjs from "dayjs";
import z from "zod";

const TRIGGERS_SUPPORTING_ANTES: TCampaignTriggerTypeEnum[] = ["ANIVERSARIO_CLIENTE", "PIOR-DIA-VENDAS"];

export function validateRecurrentCampaign(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.gatilhoTipo !== "RECORRENTE") return;

	if (!campaign.recorrenciaTipo) {
		throw new createHttpError.BadRequest("Selecione a frequência de recorrência (DIARIO, SEMANAL ou MENSAL).");
	}

	if (campaign.recorrenciaTipo === "SEMANAL") {
		if (!campaign.recorrenciaDiasSemana) {
			throw new createHttpError.BadRequest("Selecione pelo menos um dia da semana para a campanha recorrente semanal.");
		}
		const dias: number[] = JSON.parse(campaign.recorrenciaDiasSemana);
		if (!Array.isArray(dias) || dias.length === 0 || dias.some((d) => d < 0 || d > 6)) {
			throw new createHttpError.BadRequest("Dias da semana inválidos. Use valores entre 0 (Domingo) e 6 (Sábado).");
		}
	}

	if (campaign.recorrenciaTipo === "MENSAL") {
		if (!campaign.recorrenciaDiasMes) {
			throw new createHttpError.BadRequest("Selecione pelo menos um dia do mês para a campanha recorrente mensal.");
		}
		const dias: number[] = JSON.parse(campaign.recorrenciaDiasMes);
		if (!Array.isArray(dias) || dias.length === 0 || dias.some((d) => d < 1 || d > 31)) {
			throw new createHttpError.BadRequest("Dias do mês inválidos. Use valores entre 1 e 31.");
		}
	}
}

export function validateCampaignFrequencyInterval(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.gatilhoTipo === "USO-UNICO") return;
	if (!campaign.permitirRecorrencia) return;

	if (!campaign.frequenciaIntervaloMedida || !campaign.frequenciaIntervaloValor || campaign.frequenciaIntervaloValor <= 0) {
		throw new createHttpError.BadRequest("A frequência de intervalo deve ser maior que zero quando a recorrência estiver ativa.");
	}
}

export function validateExecutionDelayDirection(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.execucaoAgendadaDirecao === "ANTES" && !TRIGGERS_SUPPORTING_ANTES.includes(campaign.gatilhoTipo)) {
		throw new createHttpError.BadRequest("A direção 'ANTES' só é suportada para os gatilhos: Aniversário do cliente.");
	}
}

export function validateCashbackExpiringTrigger(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.gatilhoTipo !== "CASHBACK-EXPIRANDO") return;

	if (
		!campaign.gatilhoCashbackExpirandoAntecedenciaMedida ||
		!campaign.gatilhoCashbackExpirandoAntecedenciaValor ||
		campaign.gatilhoCashbackExpirandoAntecedenciaValor <= 0
	) {
		throw new createHttpError.BadRequest("Informe uma antecedência válida para cashback expirando.");
	}
}

export function validateSingleUseCampaign(campaign: z.infer<typeof CampaignSchema>) {
	if (campaign.gatilhoTipo !== "USO-UNICO") return;

	if (!campaign.gatilhoUsoUnicoDataReferencia) {
		throw new createHttpError.BadRequest("Data de referência do uso único não informada.");
	}

	const date = dayjs(campaign.gatilhoUsoUnicoDataReferencia);
	if (!date.isValid() || date.format("YYYY-MM-DD") !== campaign.gatilhoUsoUnicoDataReferencia) {
		throw new createHttpError.BadRequest("Data de referência do uso único inválida.");
	}
}

export async function validateCampaignTemplateTriggerCompatibility(
	whatsappTemplateId: string | null | undefined,
	gatilhoTipo: TCampaignTriggerTypeEnum,
) {
	if (!whatsappTemplateId) return;

	const template = await db.query.messageTemplates.findFirst({
		where: (fields, { eq }) => eq(fields.id, whatsappTemplateId),
		columns: { conteudo: true },
	});
	if (!template) return;

	const parametros = template.conteudo.corpo.parametros.map((parametro) => ({
		nome: parametro.identificadorInterno,
		exemplo: parametro.exemplo,
		identificador: parametro.identificadorInterno,
	}));
	const validation = validateTemplateForTrigger(parametros, gatilhoTipo);
	if (!validation.valid) {
		throw new createHttpError.BadRequest(
			`O template selecionado contém variáveis incompatíveis com o gatilho escolhido: ${validation.incompatibleVariables.join(", ")}.`,
		);
	}
}

export async function getOrganizationWeeklyCampaignLimit(organizationId: string) {
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizationId),
		columns: { configuracao: true },
	});

	return organization?.configuracao?.preferencias?.limiteMensagensSemanaisViaCampanhas ?? null;
}

export function getEffectiveCampaignWeeklyLimit({
	organizationWeeklyLimit,
	campaignWeeklyLimit,
	operation,
	campaignId,
	organizationId,
}: {
	organizationWeeklyLimit: number | null;
	campaignWeeklyLimit: number | null | undefined;
	operation: "CREATE" | "UPDATE";
	campaignId?: string;
	organizationId: string;
}) {
	if (campaignWeeklyLimit == null) return organizationWeeklyLimit;
	if (organizationWeeklyLimit == null) return campaignWeeklyLimit;

	const effectiveLimit = Math.min(campaignWeeklyLimit, organizationWeeklyLimit);
	if (campaignWeeklyLimit > organizationWeeklyLimit) {
		console.warn(
			`[WARN] [${operation}_CAMPAIGN] limiteEnviosSemanais da campanha excede limite da organização; limite efetivo será aplicado no processamento.`,
			{
				campaignId: campaignId ?? null,
				organizationId,
				campaignWeeklyLimit,
				organizationWeeklyLimit,
				effectiveLimit,
			},
		);
	}

	return effectiveLimit;
}

export function validateCampaignCashbackGeneration(campaign: z.infer<typeof CampaignSchema>) {
	if (!campaign.cashbackGeracaoAtivo) return;

	if (!campaign.cashbackGeracaoTipo) {
		throw new createHttpError.BadRequest("Selecione o tipo de geração de cashback (FIXO ou PERCENTUAL).");
	}
	if (!campaign.cashbackGeracaoValor || campaign.cashbackGeracaoValor <= 0) {
		throw new createHttpError.BadRequest("Informe um valor válido para o cashback.");
	}
	if (campaign.cashbackGeracaoTipo === "PERCENTUAL") {
		const validTriggersForPercentual = ["NOVA-COMPRA", "PRIMEIRA-COMPRA"];
		if (!validTriggersForPercentual.includes(campaign.gatilhoTipo)) {
			throw new createHttpError.BadRequest("Cashback percentual só pode ser usado com gatilhos NOVA-COMPRA ou PRIMEIRA-COMPRA.");
		}
	}
}

export function validateCampaignCouponGeneration(campaign: z.infer<typeof CampaignSchema>) {
	if (!campaign.cupomGeracaoAtivo) return;

	if (!campaign.cupomGeracaoCupomId) {
		throw new createHttpError.BadRequest("Selecione o cupom a ser atribuído pela campanha.");
	}
}
