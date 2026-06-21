import { tool } from "ai";
import { db } from "@/services/drizzle";
import { campaignConversions, campaigns, interactions } from "@/services/drizzle/schema";
import { and, avg, count, countDistinct, eq, gte, lte, sum } from "drizzle-orm";
import dayjs from "dayjs";
import z from "zod";
import { getIdentificationRate, getRepurchaseCycle, getSegmentDistribution } from "@/lib/commercial-analysis";
import { getCustomerPurchaseInsights } from "@/lib/ai/ai-agent/database-tools";
import { CampaignCreationSuggestionSchema, CampaignUpdateProposedChangesSchema, CampaignUpdateSuggestionSchema, type TMarketingSuggestion } from "./schemas";
import { buildCampaignCurrentSummary, normalizeCampaignCreationSuggestion, normalizeCampaignUpdateSuggestion } from "./suggestions";
import { getWhatsappTemplatePlainText } from "./template-text";

const AnalysisMonthsSchema = z
	.number()
	.int()
	.positive()
	.max(36)
	.optional()
	.describe("Janela de análise em meses (padrão 12).");

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
					texto: getWhatsappTemplatePlainText(campaign.whatsappTemplate.conteudo),
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
		messageTemplateText: string;
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
			messageTemplateText: input.messageTemplateText,
			justificativa: input.justificativa,
			impactoEsperado: input.impactoEsperado ?? null,
		}),
	});

	return {
		tipo: "campaign-updates-suggestion",
		payload: suggestion,
	};
}

export function createGetCampaignPerformanceByIdTool({ organizacaoId }: { organizacaoId: string }) {
	return tool({
		description:
			"Busca detalhes completos de performance e configuração de uma campanha específica. Use quando precisar entender uma campanha existente antes de recomendar uma próxima ação.",
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
	});
}

export function createDraftCampaignCreationSuggestionTool({ organizacaoId }: { organizacaoId: string }) {
	return tool({
		description:
			"Valida e normaliza uma proposta de nova campanha. Use apenas quando houver uma recomendação concreta pronta para aprovação humana. Em messageTemplateText envie somente o corpo da mensagem. limiteEnviosSemanais é o volume semanal de mensagens individuais da campanha.",
		inputSchema: CampaignCreationSuggestionSchema,
		execute: async (input) => {
			return await draftCampaignCreationSuggestion({
				organizacaoId,
				input,
			});
		},
	});
}

export function createDraftCampaignUpdateSuggestionTool({ organizacaoId }: { organizacaoId: string }) {
	return tool({
		description:
			"Valida e normaliza uma proposta de atualização de campanha existente. Use quando já houver uma campanha específica para otimizar. Em messageTemplateText envie somente o corpo da mensagem e preserve cabeçalho, rodapé, botões e mídia já existentes. limiteEnviosSemanais é o volume semanal de mensagens individuais da campanha.",
		inputSchema: z
			.object({
				campaignId: z.string().describe("ID da campanha a ser otimizada."),
				proposedChanges: CampaignUpdateProposedChangesSchema,
				segmentations: z.array(z.string()).describe("Lista final de segmentações recomendadas para a campanha."),
				messageTemplateText: z
					.string()
					.describe("Somente o corpo da mensagem sugerida. Nao inclua nem altere cabecalho, rodape, botoes, midia ou prefixos como 'Corpo:' ."),
				justificativa: z.string().describe("Resumo objetivo do porquê as mudanças propostas fazem sentido."),
				impactoEsperado: z.string().optional().nullable().describe("Impacto esperado da otimização, quando aplicável."),
			})
			.strict(),
		execute: async (input) => {
			return await draftCampaignUpdateSuggestion({
				organizacaoId,
				input,
			});
		},
	});
}

export function createGetIdentificationRateTool({ organizacaoId }: { organizacaoId: string }) {
	return tool({
		description:
			"Mede a taxa de identificação de cliente nas vendas (a métrica-mãe do diagnóstico). Toda análise de cliente é cega para vendas sem cliente identificado, então uma taxa baixa indica que a base analítica representa só uma fração — geralmente enviesada — do negócio. Também retorna o viés de seleção (ticket identificado vs. anônimo). Use no início de qualquer diagnóstico de organização.",
		inputSchema: z.object({ months: AnalysisMonthsSchema }).strict(),
		execute: async ({ months }) => {
			return await getIdentificationRate({ organizacaoId, months: months ?? 12 });
		},
	});
}

export function createGetRepurchaseCycleTool({ organizacaoId }: { organizacaoId: string }) {
	return tool({
		description:
			"Estima o ciclo natural de recompra da base (mediana e percentis P25/P75/P90 do intervalo entre compras, em dias). Use para calibrar quando um cliente fugiu do ciclo (limite de inatividade sugerido = P90) em vez de usar um prazo arbitrário, e para dimensionar o timing de campanhas de reativação.",
		inputSchema: z.object({ months: AnalysisMonthsSchema }).strict(),
		execute: async ({ months }) => {
			return await getRepurchaseCycle({ organizacaoId, months: months ?? 12 });
		},
	});
}

export function createGetSegmentDistributionTool({ organizacaoId }: { organizacaoId: string }) {
	return tool({
		description:
			"Retorna a distribuição da base pelos segmentos RFM já calculados, com nº de clientes e receita histórica por segmento, e separa explicitamente quem nunca comprou (não é alvo de reativação) dos genuinamente esfriados. Use para dimensionar a oportunidade de fidelização (topo) e de reativação (segmentos frios).",
		inputSchema: z.object({}).strict(),
		execute: async () => {
			return await getSegmentDistribution({ organizacaoId });
		},
	});
}

export function createGetCustomerInsightsTool() {
	return tool({
		description:
			"Aprofunda em um cliente específico: classificação RFM, estatísticas de compra, grupos favoritos e produtos mais comprados. Use apenas para drill-down quando o diagnóstico ou a recomendação dependerem de um cliente concreto citado no contexto.",
		inputSchema: z.object({ clientId: z.string().describe("ID do cliente.") }).strict(),
		execute: async ({ clientId }) => {
			return await getCustomerPurchaseInsights(clientId);
		},
	});
}

export function createMarketingAnalystTools({ organizacaoId }: { organizacaoId: string }) {
	return {
		get_campaign_performance_by_id: createGetCampaignPerformanceByIdTool({ organizacaoId }),
		get_identification_rate: createGetIdentificationRateTool({ organizacaoId }),
		get_repurchase_cycle: createGetRepurchaseCycleTool({ organizacaoId }),
		get_segment_distribution: createGetSegmentDistributionTool({ organizacaoId }),
		get_customer_insights: createGetCustomerInsightsTool(),
	};
}

export function createMarketingExecutorTools({ organizacaoId }: { organizacaoId: string }) {
	return {
		draft_campaign_creation_suggestion: createDraftCampaignCreationSuggestionTool({ organizacaoId }),
		draft_campaign_update_suggestion: createDraftCampaignUpdateSuggestionTool({ organizacaoId }),
	};
}

export function createMarketingAgentTools({ organizacaoId }: { organizacaoId: string }) {
	return {
		...createMarketingAnalystTools({ organizacaoId }),
		...createMarketingExecutorTools({ organizacaoId }),
	};
}
