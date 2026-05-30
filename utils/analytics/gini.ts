export function giniCoefficient(values: number[]) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const sum = sorted.reduce((acc, value) => acc + value, 0);
	if (sum === 0) return 0;

	const n = sorted.length;
	let numerator = 0;
	for (let i = 0; i < n; i++) {
		numerator += (2 * (i + 1) - n - 1) * (sorted[i] ?? 0);
	}
	return numerator / (n * sum);
}

export function countProductsForRevenueShare(productRevenues: number[], targetShare: number) {
	const sorted = [...productRevenues].sort((a, b) => b - a);
	const total = sorted.reduce((acc, value) => acc + value, 0);
	if (total === 0) return 0;

	let accumulated = 0;
	let count = 0;
	for (const revenue of sorted) {
		accumulated += revenue;
		count += 1;
		if (accumulated / total >= targetShare) break;
	}
	return count;
}
