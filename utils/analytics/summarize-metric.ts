import { percentile } from "./percentile";

export const ANALYTICS_PERCENTILES = [0, 5, 10, 25, 50, 75, 90, 95, 100] as const;

export type TMetricSummary = {
	count: number;
	average: number | null;
	median: number | null;
	percentiles: Record<`p${(typeof ANALYTICS_PERCENTILES)[number]}`, number | null>;
};

export function summarizeMetric(values: number[]): TMetricSummary {
	const percentilesMap = Object.fromEntries(ANALYTICS_PERCENTILES.map((p) => [`p${p}`, percentile(values, p)])) as TMetricSummary["percentiles"];
	const sum = values.reduce((acc, value) => acc + value, 0);
	const average = values.length > 0 ? sum / values.length : null;
	const median = percentile(values, 50);
	return {
		count: values.length,
		average,
		median,
		percentiles: percentilesMap,
	};
}
