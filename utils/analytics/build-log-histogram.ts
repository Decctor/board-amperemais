import { percentile } from "./percentile";
import type { THistogram, THistogramBin } from "./build-histogram";

const DEFAULT_LOG_BIN_EDGES = [0, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

export function buildLogHistogram(values: number[], options: { clipToPercentile?: number; binEdges?: number[] } = {}): THistogram {
	const positiveValues = values.filter((value) => value > 0);
	if (positiveValues.length === 0) return { bins: [], min: 0, max: 0, clippedAt: null, overflowCount: 0 };

	const clipPercentile = options.clipToPercentile ?? 95;
	const clipMax = percentile(positiveValues, clipPercentile);
	const maxValueRaw = Math.max(...positiveValues);
	const effectiveMax = clipMax && clipMax > 0 ? clipMax : maxValueRaw;

	const rawEdges = options.binEdges ?? DEFAULT_LOG_BIN_EDGES;
	const edges = rawEdges.filter((edge, index) => index === 0 || edge <= effectiveMax * 1.01);
	if (edges[edges.length - 1] < effectiveMax) {
		edges.push(effectiveMax);
	}

	const bins: THistogramBin[] = [];
	for (let index = 0; index < edges.length - 1; index++) {
		bins.push({
			start: edges[index],
			end: edges[index + 1],
			count: 0,
		});
	}

	let overflowCount = 0;
	for (const value of positiveValues) {
		if (value > effectiveMax) {
			overflowCount += 1;
			continue;
		}
		let binIndex = bins.length - 1;
		for (let i = 0; i < bins.length; i++) {
			const bin = bins[i];
			const isLast = i === bins.length - 1;
			if (value >= bin.start && (value < bin.end || isLast)) {
				binIndex = i;
				break;
			}
		}
		bins[binIndex].count += 1;
	}

	return {
		bins,
		min: Math.min(...positiveValues),
		max: maxValueRaw,
		clippedAt: overflowCount > 0 ? effectiveMax : null,
		overflowCount,
	};
}
