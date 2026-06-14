import type { CampaignReportStatsResult } from "./campaign-data-fetchers";
import type { OverallSalesStatsResult, PartnerRankingItem, ProductRankingItem, SellerRankingItem } from "./data-fetchers";

export type TReportFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export type TReportPeriod = {
	frequency: TReportFrequency;
	label: string;
	after: Date;
	before: Date;
	comparisonAfter: Date;
	comparisonBefore: Date;
	storageKey: string;
};

export type TReportTheme = {
	orgName: string;
	logoUrl: string | null;
	primary: string;
	primaryForeground: string;
	secondary: string;
	secondaryForeground: string;
};

export type TReportTimelinePoint = {
	label: string;
	current: number;
	previous: number;
};

export type TSalesReportPayload = {
	theme: TReportTheme;
	period: TReportPeriod;
	stats: OverallSalesStatsResult;
	topSellers: SellerRankingItem[];
	topPartners: PartnerRankingItem[];
	topProducts: ProductRankingItem[];
	timeline: TReportTimelinePoint[];
};

/** Commercial figures kept as supporting context inside the campaign-impact report. */
export type TCommercialSummary = {
	faturamento: { atual: number; anterior: number | undefined };
	qtdeVendas: number;
	ticketMedio: number;
	qtdeItensVendidos: number;
	valorDiarioVendido: number;
	itensPorVenda: number;
	margemBruta: number;
	custoTotal: number;
};

export type TCampaignReportPayload = {
	theme: TReportTheme;
	period: TReportPeriod;
	campaign: CampaignReportStatsResult;
	commercial: TCommercialSummary;
};
