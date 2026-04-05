import { tool } from "ai";
import { db } from "@/services/drizzle";
import { campaignConversions, campaigns, interactions } from "@/services/drizzle/schema";
import { and, avg, count, countDistinct, eq, gte, lte, sum } from "drizzle-orm";
import dayjs from "dayjs";
import z from "zod";
import { CampaignCreationSuggestionSchema, CampaignUpdateProposedChangesSchema, CampaignUpdateSuggestionSchema, type TMarketingSuggestion } from "./schemas";
import { buildCampaignCurrentSummary, normalizeCampaignCreationSuggestion, normalizeCampaignUpdateSuggestion } from "./suggestions";
import { getWhatsappTemplatePlainText } from "./template-text";

type TGetCampaignPerformanceByIdInput = {
	orgId: string;
	campaignId: string;
	periodStart?: Date;
	periodEnd?: Date;
};

export async function getCampaignPerformanceById({
	orgId,
	campaignId,
	periodStart,
	periodEnd,
}: TGetCampaignPerformanceByIdInput) {
	const effectivePeriodStart = periodStart ?? dayjs().subtract(30, "days").startOf("day").toDate();
	const effectivePeriodEnd = periodEnd ?? dayjs().endOf("day").toDate();

	const campaign = await db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, campaignId), eq(campaigns.organizacaoId, orgId)),
		with: {
			segmentacoes: true,
			whatsappTemplate: true,
			whatsappConexaoTelefone: true,
		},
	});

	if (!campaign) {
		throw new Error("Campanha não encontrada.");
	}

	const dateRangeConditions = [
		eq(interactions.campanhaId, campaignId),
		eq(interactions.organizacaoId, orgId),
		eq(interactions.tipo, "ENVIO-MENSAGEM"),
		gte(interactions.dataInsercao, effectivePeriodStart),
		lte(interactions.dataInsercao, effectivePeriodEnd),
	];

	const interactionsResult = await db
		.select({
			total: count(interactions.id),
			clientesAlcancados: countDistinct(interactions.clienteId),
		})
		.from(interactions)
		.where(and(...dateRangeConditions));

	const deliveryResult = await db
		.select({
			statusEnvio: interactions.statusEnvio,
			total: count(interactions.id),
		})
		.from(interactions)
		.where(and(...dateRangeConditions))
		.groupBy(interactions.statusEnvio);

	const conversionsResult = await db
		.select({
			total: count(campaignConversions.id),
			receitaTotal: sum(campaignConversions.atribuicaoReceita),
			tempoMedioMinutos: avg(campaignConversions.tempoParaConversaoMinutos),
			clientesConvertidos: countDistinct(campaignConversions.clienteId),
			ticketMedio: avg(campaignConversions.vendaValor),
		})
		.from(campaignConversions)
		.where(
			and(
				eq(campaignConversions.campanhaId, campaignId),
				eq(campaignConversions.organizacaoId, orgId),
				gte(campaignConversions.dataConversao, effectivePeriodStart),
				lte(campaignConversions.dataConversao, effectivePeriodEnd),
			),
		);

	const interacoesEnviadas = interactionsResult[0]?.total ?? 0;
	const clientesAlcancados = interactionsResult[0]?.clientesAlcancados ?? 0;
	const totalEntregues = deliveryResult
		.filter((result) => result.statusEnvio === "ENTREGUE" || result.statusEnvio === "LIDO")
		.reduce((acc, result) => acc + result.total, 0);
	const totalFalhas = deliveryResult.find((result) => result.statusEnvio === "FALHOU")?.total ?? 0;
	const conversoes = conversionsResult[0]?.total ?? 0;
	const receitaAtribuida = Number(conversionsResult[0]?.receitaTotal ?? 0);
	const tempoMedioConversaoHoras = Number(conversionsResult[0]?.tempoMedioMinutos ?? 0) / 60;
	const clientesConvertidos = conversionsResult[0]?.clientesConvertidos ?? 0;
	const ticketMedioConversao = Number(conversionsResult[0]?.ticketMedio ?? 0);
	const taxaConversao = interacoesEnviadas > 0 ? (conversoes / interacoesEnviadas) * 100 : 0;

	return {
		id: campaign.id,
		titulo: campaign.titulo,
		descricao: campaign.descricao,
		gatilhoTipo: campaign.gatilhoTipo,
		ativo: campaign.ativo,
		configuracao: {
			whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId,
			execucaoAgendadaMedida: campaign.execucaoAgendadaMedida,
			execucaoAgendadaValor: campaign.execucaoAgendadaValor,
			execucaoAgendadaDirecao: campaign.execucaoAgendadaDirecao,
			execucaoAgendadaBloco: campaign.execucaoAgendadaBloco,
			permitirRecorrencia: campaign.permitirRecorrencia,
			limiteEnviosSemanais: campaign.limiteEnviosSemanais,
			frequenciaIntervaloValor: campaign.frequenciaIntervaloValor,
			frequenciaIntervaloMedida: campaign.frequenciaIntervaloMedida,
			atribuicaoModelo: campaign.atribuicaoModelo,
			atribuicaoJanelaDias: campaign.atribuicaoJanelaDias,
			recorrenciaTipo: campaign.recorrenciaTipo,
			recorrenciaIntervalo: campaign.recorrenciaIntervalo,
			recorrenciaDiasSemana: campaign.recorrenciaDiasSemana,
			recorrenciaDiasMes: campaign.recorrenciaDiasMes,
			cashbackGeracaoAtivo: campaign.cashbackGeracaoAtivo,
			cashbackGeracaoTipo: campaign.cashbackGeracaoTipo,
			cashbackGeracaoValor: campaign.cashbackGeracaoValor,
			cashbackGeracaoExpiracaoMedida: campaign.cashbackGeracaoExpiracaoMedida,
			cashbackGeracaoExpiracaoValor: campaign.cashbackGeracaoExpiracaoValor,
		},
		segmentacoes: campaign.segmentacoes.map((item) => item.segmentacao),
		whatsappConexaoTelefone: campaign.whatsappConexaoTelefone
			? {
					id: campaign.whatsappConexaoTelefone.id,
					nome: campaign.whatsappConexaoTelefone.nome,
					numero: campaign.whatsappConexaoTelefone.numero,
				}
			: null,
		whatsappTemplate: campaign.whatsappTemplate
			? {
					id: campaign.whatsappTemplate.id,
					nome: campaign.whatsappTemplate.nome,
					texto: getWhatsappTemplatePlainText(campaign.whatsappTemplate.componentes),
				}
			: null,
		periodoAnalise: {
			inicio: effectivePeriodStart.toISOString(),
			fim: effectivePeriodEnd.toISOString(),
		},
		estatisticas: {
			interacoes: interacoesEnviadas,
			clientesAlcancados,
			totalEntregues,
			totalFalhas,
			receitaAtribuida,
			conversoes,
			clientesConvertidos,
			taxaConversao,
			tempoMedioConversaoHoras,
			ticketMedioConversao,
		},
	};
}

export async function draftCampaignCreationSuggestion({
	organizacaoId,
	input,
}: {
	organizacaoId: string;
	input: z.infer<typeof CampaignCreationSuggestionSchema>;
}): Promise<TMarketingSuggestion> {
	const suggestion = await normalizeCampaignCreationSuggestion({
		organizacaoId,
		suggestion: input,
	});

	return {
		tipo: "campaign-creation-suggestion",
		payload: suggestion,
	};
}

export async function draftCampaignUpdateSuggestion({
	organizacaoId,
	input,
}: {
	organizacaoId: string;
	input: {
		campaignId: string;
		proposedChanges: z.infer<typeof CampaignUpdateProposedChangesSchema>;
		segmentations: string[];
		whatsappTemplateText: string;
		justificativa: string;
		impactoEsperado?: string | null;
	};
}): Promise<TMarketingSuggestion> {
	const currentSummary = await buildCampaignCurrentSummary({
		organizacaoId,
		campaignId: input.campaignId,
	});

	const suggestion = await normalizeCampaignUpdateSuggestion({
		organizacaoId,
		suggestion: CampaignUpdateSuggestionSchema.parse({
			campaignId: input.campaignId,
			campaignTitle: currentSummary.titulo,
			currentSummary,
			proposedChanges: input.proposedChanges,
			segmentations: input.segmentations,
			whatsappTemplateText: input.whatsappTemplateText,
			justificativa: input.justificativa,
			impactoEsperado: input.impactoEsperado ?? null,
		}),
	});

	return {
		tipo: "campaign-updates-suggestion",
		payload: suggestion,
	};
}

export function createMarketingAgentTools({ organizacaoId }: { organizacaoId: string }) {
	return {
		get_campaign_performance_by_id: tool({
			description:
				"Busca detalhes completos de performance e configuração de uma campanha específica. Use antes de propor mudanças em campanha existente.",
			inputSchema: z
				.object({
					campaignId: z.string().describe("ID da campanha."),
					periodStart: z.string().optional().describe("Data inicial ISO opcional."),
					periodEnd: z.string().optional().describe("Data final ISO opcional."),
				})
				.strict(),
			execute: async ({ campaignId, periodStart, periodEnd }) => {
				return await getCampaignPerformanceById({
					orgId: organizacaoId,
					campaignId,
					periodStart: periodStart ? new Date(periodStart) : undefined,
					periodEnd: periodEnd ? new Date(periodEnd) : undefined,
				});
			},
		}),
		draft_campaign_creation_suggestion: tool({
			description:
				"Valida e normaliza uma proposta de nova campanha. Use apenas quando houver uma recomendação concreta pronta para aprovação humana.",
			inputSchema: CampaignCreationSuggestionSchema,
			execute: async (input) => {
				return await draftCampaignCreationSuggestion({
					organizacaoId,
					input,
				});
			},
		}),
		draft_campaign_update_suggestion: tool({
			description:
				"Valida e normaliza uma proposta de atualização de campanha existente. Use quando já houver uma campanha específica para otimizar.",
			inputSchema: z
				.object({
					campaignId: z.string(),
					proposedChanges: CampaignUpdateProposedChangesSchema,
					segmentations: z.array(z.string()),
					whatsappTemplateText: z.string(),
					justificativa: z.string(),
					impactoEsperado: z.string().optional().nullable(),
				})
				.strict(),
			execute: async (input) => {
				return await draftCampaignUpdateSuggestion({
					organizacaoId,
					input,
				});
			},
		}),
	};
}
