import type { TProductAbcClass, TProductWithPeriodMetrics, TAbcDistributionItem } from "./types";

export function classifyProductAbc(revenue: number, accumulatedBefore: number, totalRevenue: number): TProductAbcClass {
	if (totalRevenue <= 0 || revenue <= 0) return "C";
	const prevPercentage = accumulatedBefore / totalRevenue;
	if (prevPercentage < 0.8) return "A";
	if (prevPercentage < 0.95) return "B";
	return "C";
}

export function assignAbcClasses(
	products: { productId: string; revenue: number; cost: number; quantity: number; saleCount: number }[],
): TProductWithPeriodMetrics[] {
	const sorted = [...products].sort((a, b) => b.revenue - a.revenue);
	const totalRevenue = sorted.reduce((acc, product) => acc + product.revenue, 0);
	let accumulated = 0;

	return sorted.map((product) => {
		const margin = product.revenue - product.cost;
		const marginPercentage = product.revenue > 0 ? (margin / product.revenue) * 100 : 0;
		const abcClass = classifyProductAbc(product.revenue, accumulated, totalRevenue);
		accumulated += product.revenue;

		return {
			...product,
			marginPercentage,
			abcClass,
		};
	});
}

const ABC_LABELS: TProductAbcClass[] = ["A", "B", "C"];

export function buildAbcDistribution(activeProducts: TProductWithPeriodMetrics[]): TAbcDistributionItem[] {
	const activeCount = activeProducts.length;
	const totalRevenue = activeProducts.reduce((acc, product) => acc + product.revenue, 0);

	return ABC_LABELS.map((label) => {
		const productsInClass = activeProducts.filter((product) => product.abcClass === label);
		const count = productsInClass.length;
		const classRevenue = productsInClass.reduce((acc, product) => acc + product.revenue, 0);
		return {
			label,
			count,
			percentage: activeCount > 0 ? (count / activeCount) * 100 : 0,
			revenueShare: totalRevenue > 0 ? (classRevenue / totalRevenue) * 100 : 0,
		};
	});
}
