import type { OverallSalesStatsResult, PartnerRankingItem, ProductRankingItem, SellerRankingItem } from "./data-fetchers";

export type TReportFrequency = "daily" | "weekly" | "monthly";

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
