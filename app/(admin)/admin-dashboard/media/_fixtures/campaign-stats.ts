import type { TGetCampaignFunnelOutput } from "@/app/api/campaigns/stats/funnel/route";
import type { TGetCampaignGraphOutput } from "@/app/api/campaigns/stats/graph/route";
import type { TGetCampaignRankingOutput } from "@/app/api/campaigns/stats/ranking/route";
import type { TGetCampaignStatsOverallOutput } from "@/app/api/campaigns/stats/overall/route";
import type { TGetConversionQualityOutput } from "@/app/api/campaigns/stats/conversion-quality/route";

/**
 * Números fictícios para as peças de mídia do estúdio (/admin-dashboard/media).
 *
 * Tipados contra o retorno real de cada rota de stats de propósito: se o payload
 * da API mudar, isso quebra no TypeScript em vez de gerar um print errado.
 *
 * Período de referência: 01/06 a 30/06.
 */

const PERIODO_INICIO = new Date("2025-06-01T00:00:00.000Z");
const PERIODO_FIM = new Date("2025-06-30T23:59:59.000Z");

export const MEDIA_PERIOD_LABEL = "01 jun. — 30 jun.";

export const campaignFunnelFixture: TGetCampaignFunnelOutput["data"] = {
	enviados: 18420,
	entregues: 17654,
	lidos: 13109,
	convertidos: 2287,
	taxaEntrega: 95.84,
	taxaLeitura: 74.25,
	taxaConversaoGeral: 12.42,
	taxaConversaoDeLidos: 17.45,
	periodoInicio: PERIODO_INICIO,
	periodoFim: PERIODO_FIM,
};

type TOverallCampaign = TGetCampaignStatsOverallOutput["data"]["campanhas"][number];

const overallCampaigns: TOverallCampaign[] = [
	{
		id: "cmp-recompra-30-dias",
		titulo: "Recompra em 30 dias",
		gatilhoTipo: "NOVA-COMPRA",
		ativo: true,
		interacoes: 5840,
		conversoes: 812,
		conversoesIncrementais: 498,
		taxaConversao: 13.9,
		receitaTotal: 148320.5,
		receitaIncremental: 91240.3,
	},
	{
		id: "cmp-cashback-expirando",
		titulo: "Seu cashback está expirando",
		gatilhoTipo: "CASHBACK-EXPIRANDO",
		ativo: true,
		interacoes: 3960,
		conversoes: 604,
		conversoesIncrementais: 421,
		taxaConversao: 15.25,
		receitaTotal: 96780.9,
		receitaIncremental: 67450.2,
	},
	{
		id: "cmp-reativacao-90-dias",
		titulo: "Sentimos sua falta — 90 dias",
		gatilhoTipo: "PERMANÊNCIA-SEGMENTAÇÃO",
		ativo: true,
		interacoes: 3120,
		conversoes: 352,
		conversoesIncrementais: 318,
		taxaConversao: 11.28,
		receitaTotal: 71240.0,
		receitaIncremental: 63980.4,
	},
	{
		id: "cmp-boas-vindas",
		titulo: "Boas-vindas à primeira compra",
		gatilhoTipo: "PRIMEIRA-COMPRA",
		ativo: true,
		interacoes: 2480,
		conversoes: 298,
		conversoesIncrementais: 176,
		taxaConversao: 12.02,
		receitaTotal: 52410.75,
		receitaIncremental: 29870.1,
	},
	{
		id: "cmp-aniversario",
		titulo: "Aniversário do cliente",
		gatilhoTipo: "ANIVERSARIO_CLIENTE",
		ativo: true,
		interacoes: 1640,
		conversoes: 154,
		conversoesIncrementais: 122,
		taxaConversao: 9.39,
		receitaTotal: 31890.25,
		receitaIncremental: 24110.6,
	},
	{
		id: "cmp-pior-dia",
		titulo: "Impulso na terça-feira",
		gatilhoTipo: "PIOR-DIA-VENDAS",
		ativo: false,
		interacoes: 1380,
		conversoes: 67,
		conversoesIncrementais: 51,
		taxaConversao: 4.86,
		receitaTotal: 14320.6,
		receitaIncremental: 10240.8,
	},
];

export const campaignOverallFixture: TGetCampaignStatsOverallOutput["data"] = {
	campanhas: overallCampaigns,
	totais: {
		campanhas: overallCampaigns.length,
		campanhasAtivas: overallCampaigns.filter((campaign) => campaign.ativo).length,
		interacoes: 18420,
		conversoes: 2287,
		conversoesIncrementais: 1586,
		receita: 414963.0,
		receitaIncremental: 286892.4,
		taxaConversaoGeral: 12.42,
	},
	periodoInicio: PERIODO_INICIO,
	periodoFim: PERIODO_FIM,
};

export const campaignQualityFixture: TGetConversionQualityOutput["data"] = {
	resumo: {
		totalConversoes: 2287,
		totalReceita: 414963.0,
		totalReceitaIncremental: 286892.4,
		conversoesIncrementais: 1586,
		avgTicketConversao: 181.44,
		avgTempoConversaoHoras: 26.4,
		conversoesComCicloConfiavel: 1904,
	},
	distribuicaoTipos: [
		{ tipo: "ACELERACAO", label: "Aceleração", quantidade: 912, receita: 168420.3, receitaIncremental: 121340.5, percentual: 39.88 },
		{ tipo: "REATIVACAO", label: "Reativação", quantidade: 684, receita: 142780.9, receitaIncremental: 108920.4, percentual: 29.91 },
		{ tipo: "AQUISICAO", label: "Aquisição", quantidade: 448, receita: 74210.6, receitaIncremental: 43180.7, percentual: 19.59 },
		{ tipo: "REGULAR", label: "Regular", quantidade: 243, receita: 29551.2, receitaIncremental: 13450.8, percentual: 10.62 },
	],
	impactoFrequencia: {
		deltaFrequenciaMedio: -8.4,
		totalAceleradas: 1418,
		totalAtrasadas: 386,
		mediasDiasAntecipados: 11.2,
	},
	impactoMonetario: {
		deltaMonetarioPercentualMedio: 18.7,
		totalAcimaTicket: 1362,
		totalAbaixoTicket: 621,
		mediaAumentoPercentual: 24.3,
	},
	periodo: {
		inicio: PERIODO_INICIO,
		fim: PERIODO_FIM,
	},
};

/** Série diária com uma curva plausível: sobe na semana, cai no fim de semana. */
const INTERACTION_SERIES = [
	410, 520, 610, 680, 640, 320, 240, 520, 690, 740, 810, 760, 380, 290, 640, 780, 860, 910, 840, 430, 310, 700, 820, 900, 960, 880, 460, 340, 720, 850,
];
const CONVERSION_SERIES = [
	42, 61, 78, 92, 85, 34, 24, 63, 88, 101, 118, 106, 41, 29, 82, 108, 126, 137, 121, 47, 33, 96, 118, 134, 146, 129, 52, 36, 104, 128,
];

function buildGraphSeries(values: number[]): TGetCampaignGraphOutput["data"] {
	return values.map((value, index) => ({
		label: `${String(index + 1).padStart(2, "0")}/06`,
		value,
		comparisonLabel: undefined,
		comparisonValue: undefined,
	}));
}

export const campaignInteractionsGraphFixture = buildGraphSeries(INTERACTION_SERIES);
export const campaignConversionsGraphFixture = buildGraphSeries(CONVERSION_SERIES);

type TRankingItem = TGetCampaignRankingOutput["data"][number];

function buildRankingItem(
	rank: number,
	item: Omit<TRankingItem, "rank" | "rankComparison" | "rankDelta" | "interacoesComparison" | "conversoesComparison" | "receitaComparison" | "taxaConversaoComparison" | "taxaEntregaComparison" | "taxaLeituraComparison">,
): TRankingItem {
	return {
		...item,
		rank,
		rankComparison: null,
		rankDelta: null,
		interacoesComparison: null,
		conversoesComparison: null,
		receitaComparison: null,
		taxaConversaoComparison: null,
		taxaEntregaComparison: null,
		taxaLeituraComparison: null,
	};
}

export const campaignRankingFixture: TGetCampaignRankingOutput["data"] = [
	buildRankingItem(1, {
		campanhaId: "cmp-recompra-30-dias",
		titulo: "Recompra em 30 dias",
		ativo: true,
		interacoes: 5840,
		conversoes: 812,
		receita: 148320.5,
		taxaConversao: 13.9,
		taxaEntrega: 96.2,
		taxaLeitura: 76.4,
	}),
	buildRankingItem(2, {
		campanhaId: "cmp-cashback-expirando",
		titulo: "Seu cashback está expirando",
		ativo: true,
		interacoes: 3960,
		conversoes: 604,
		receita: 96780.9,
		taxaConversao: 15.25,
		taxaEntrega: 95.8,
		taxaLeitura: 78.1,
	}),
	buildRankingItem(3, {
		campanhaId: "cmp-reativacao-90-dias",
		titulo: "Sentimos sua falta — 90 dias",
		ativo: true,
		interacoes: 3120,
		conversoes: 352,
		receita: 71240.0,
		taxaConversao: 11.28,
		taxaEntrega: 94.6,
		taxaLeitura: 69.8,
	}),
	buildRankingItem(4, {
		campanhaId: "cmp-boas-vindas",
		titulo: "Boas-vindas à primeira compra",
		ativo: true,
		interacoes: 2480,
		conversoes: 298,
		receita: 52410.75,
		taxaConversao: 12.02,
		taxaEntrega: 97.1,
		taxaLeitura: 81.3,
	}),
	buildRankingItem(5, {
		campanhaId: "cmp-aniversario",
		titulo: "Aniversário do cliente",
		ativo: true,
		interacoes: 1640,
		conversoes: 154,
		receita: 31890.25,
		taxaConversao: 9.39,
		taxaEntrega: 96.9,
		taxaLeitura: 83.7,
	}),
	buildRankingItem(6, {
		campanhaId: "cmp-pior-dia",
		titulo: "Impulso na terça-feira",
		ativo: false,
		interacoes: 1380,
		conversoes: 67,
		receita: 14320.6,
		taxaConversao: 4.86,
		taxaEntrega: 93.4,
		taxaLeitura: 61.2,
	}),
];
