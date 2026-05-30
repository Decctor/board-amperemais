export type TProductAbcClass = "A" | "B" | "C";

export type TProductPortfolioHealthAlert = {
	id: string;
	severity: "info" | "warning" | "critical";
	title: string;
	description: string;
};

export type TProductPortfolioHealthClassification = "SAUDAVEL" | "ATENCAO" | "DESALINHADA" | "INSUFICIENTE";

export type TAbcDistributionItem = {
	label: TProductAbcClass;
	count: number;
	percentage: number;
	revenueShare: number;
};

export type TProductWithPeriodMetrics = {
	productId: string;
	revenue: number;
	cost: number;
	quantity: number;
	saleCount: number;
	marginPercentage: number;
	abcClass: TProductAbcClass;
};

export type TGetPortfolioHealthResult = {
	period: {
		start: Date | null;
		end: Date | null;
	};
	totalProducts: number;
	activeProducts: number;
	dormantProducts: number;
	healthScore: {
		classification: TProductPortfolioHealthClassification;
		label: string;
		summary: string;
	};
	alerts: TProductPortfolioHealthAlert[];
	abcDistribution: TAbcDistributionItem[];
	vitality: {
		active: { count: number; percentage: number };
		dormant: { count: number; percentage: number };
	};
	concentration: {
		productsFor80PctRevenue: number;
		gini: number;
	};
	metrics: {
		revenue: import("@/utils/analytics").TMetricSummary;
		margin: import("@/utils/analytics").TMetricSummary;
		saleFrequency: import("@/utils/analytics").TMetricSummary;
	};
	histograms: {
		revenue: import("@/utils/analytics").THistogram;
		margin: import("@/utils/analytics").THistogram;
		saleFrequency: import("@/utils/analytics").TDiscreteHistogramBucket[];
	};
};
