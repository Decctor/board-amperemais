import { percentile } from "./percentile";

export type THistogramBin = {
	start: number;
	end: number;
	count: number;
};

export type THistogram = {
	bins: THistogramBin[];
	min: number;
	max: number;
	clippedAt: number | null;
	overflowCount: number;
};

export function buildHistogram(values: number[], binCount: number, options: { clipToPercentile?: number } = {}): THistogram {
	if (values.length === 0) return { bins: [], min: 0, max: 0, clippedAt: null, overflowCount: 0 };

	const minValue = Math.min(...values);
	const maxValueRaw = Math.max(...values);
	const clipPercentile = options.clipToPercentile ?? null;
	const clippedAt = clipPercentile ? percentile(values, clipPercentile) : null;
	const maxValue = clippedAt && clippedAt > minValue ? clippedAt : maxValueRaw;
	const range = maxValue - minValue;
	const binSize = range > 0 ? range / binCount : 1;
	const bins = Array.from({ length: binCount }, (_, index) => {
		const start = minValue + index * binSize;
		const end = index === binCount - 1 ? maxValue : start + binSize;
		return { start, end, count: 0 };
	});

	let overflowCount = 0;
	for (const value of values) {
		if (value > maxValue) {
			overflowCount += 1;
			continue;
		}
		const relative = value - minValue;
		const indexCandidate = binSize > 0 ? Math.floor(relative / binSize) : 0;
		const index = Math.max(0, Math.min(binCount - 1, indexCandidate));
		bins[index].count += 1;
	}

	return {
		bins,
		min: minValue,
		max: maxValueRaw,
		clippedAt: overflowCount > 0 ? maxValue : null,
		overflowCount,
	};
}
