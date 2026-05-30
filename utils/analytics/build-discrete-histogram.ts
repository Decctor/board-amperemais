export type TDiscreteHistogramBucket = {
	label: string;
	min: number;
	max: number;
	count: number;
};

export function buildDiscreteHistogram(values: number[], buckets: { label: string; min: number; max: number }[]): TDiscreteHistogramBucket[] {
	return buckets.map((bucket) => ({
		label: bucket.label,
		min: bucket.min,
		max: bucket.max,
		count: values.filter((value) => value >= bucket.min && value <= bucket.max).length,
	}));
}
