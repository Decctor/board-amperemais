import { getCampaignReportStats } from "./campaign-data-fetchers";
import {
	type PartnerRankingItem,
	type ProductRankingItem,
	type SellerRankingItem,
	getOverallSalesStats,
	getPartnerRankings,
	getProductRankings,
	getSalesTimelineForReport,
	getSellerRankings,
} from "./data-fetchers";
import { getReportPeriod } from "./periods";
import type { TCampaignReportPayload, TReportFrequency, TReportTheme, TSalesReportPayload } from "./types";

export const REPORT_THEME_DEFAULTS = {
	primary: "#FFB900",
	primaryForeground: "#000000",
	secondary: "#24549C",
	secondaryForeground: "#FFFFFF",
} as const;

export type TReportOrganization = {
	id: string;
	nome: string;
	logoUrl: string | null;
	corPrimaria: string | null;
	corPrimariaForeground: string | null;
	corSecundaria: string | null;
	corSecundariaForeground: string | null;
};

type BuildSalesReportPayloadParams = {
	frequency: TReportFrequency;
	organization: TReportOrganization;
	referenceDate?: Date;
};

export function getReportTheme(organization: TReportOrganization): TReportTheme {
	return {
		orgName: organization.nome,
		logoUrl: organization.logoUrl,
		primary: organization.corPrimaria || REPORT_THEME_DEFAULTS.primary,
		primaryForeground: organization.corPrimariaForeground || REPORT_THEME_DEFAULTS.primaryForeground,
		secondary: organization.corSecundaria || REPORT_THEME_DEFAULTS.secondary,
		secondaryForeground: organization.corSecundariaForeground || REPORT_THEME_DEFAULTS.secondaryForeground,
	};
}

export async function buildSalesReportPayload({
	frequency,
	organization,
	referenceDate,
}: BuildSalesReportPayloadParams): Promise<TSalesReportPayload> {
	const period = getReportPeriod(frequency, referenceDate);
	const queryParams = {
		after: period.after,
		before: period.before,
		comparisonAfter: period.comparisonAfter,
		comparisonBefore: period.comparisonBefore,
		organizacaoId: organization.id,
	};

	const [stats, topSellers, topPartners, topProducts, timeline] = await Promise.all([
		getOverallSalesStats(queryParams),
		getSellerRankings(queryParams, 3),
		getPartnerRankings(queryParams, 3),
		getProductRankings(queryParams, 3),
		getSalesTimelineForReport({ ...queryParams, frequency }),
	]);

	return {
		theme: getReportTheme(organization),
		period,
		stats,
		topSellers,
		topPartners,
		topProducts,
		timeline,
	};
}

export async function buildCampaignReportPayload({
	frequency,
	organization,
	referenceDate,
}: BuildSalesReportPayloadParams): Promise<TCampaignReportPayload> {
	const period = getReportPeriod(frequency, referenceDate);
	const queryParams = {
		after: period.after,
		before: period.before,
		comparisonAfter: period.comparisonAfter,
		comparisonBefore: period.comparisonBefore,
		organizacaoId: organization.id,
	};

	const [campaign, stats] = await Promise.all([getCampaignReportStats(queryParams), getOverallSalesStats(queryParams)]);

	return {
		theme: getReportTheme(organization),
		period,
		campaign,
		commercial: {
			faturamento: stats.faturamento,
			qtdeVendas: stats.qtdeVendas.atual,
			ticketMedio: stats.ticketMedio.atual,
			qtdeItensVendidos: stats.qtdeItensVendidos.atual,
			valorDiarioVendido: stats.valorDiarioVendido.atual,
			itensPorVenda: stats.itensPorVendaMedio.atual,
			margemBruta: stats.margemBruta.atual,
			custoTotal: stats.custoTotal.atual,
		},
	};
}

export function getReportHighlight({
	topSellers,
	topProducts,
}: {
	topSellers: SellerRankingItem[];
	topProducts: ProductRankingItem[];
	topPartners?: PartnerRankingItem[];
}) {
	const bestSeller = topSellers.find((seller) => seller.vendedorNome !== "N/A");
	if (bestSeller) {
		return {
			label: "Top vendedor",
			value: bestSeller.vendedorNome,
			subtitle: `${bestSeller.qtdeVendas} vendas · ${bestSeller.faturamento.toLocaleString("pt-BR", {
				style: "currency",
				currency: "BRL",
			})}`,
		};
	}

	const bestProduct = topProducts[0];
	if (bestProduct) {
		return {
			label: "Top produto",
			value: bestProduct.produtoNome,
			subtitle: `${bestProduct.quantidade} un. · ${bestProduct.faturamento.toLocaleString("pt-BR", {
				style: "currency",
				currency: "BRL",
			})}`,
		};
	}

	return {
		label: "Sem destaque",
		value: "Ainda sem líder no período",
		subtitle: "Assim que houver vendas, o resumo visual passa a mostrar os destaques.",
	};
}
