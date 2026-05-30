export function percentile(values: number[], percentileValue: number) {
	if (values.length === 0) return null;
	const sortedValues = [...values].sort((a, b) => a - b);
	const index = (percentileValue / 100) * (sortedValues.length - 1);
	const lowerIndex = Math.floor(index);
	const upperIndex = Math.ceil(index);
	const lowerValue = sortedValues[lowerIndex] ?? 0;
	const upperValue = sortedValues[upperIndex] ?? lowerValue;
	if (lowerIndex === upperIndex) return lowerValue;
	return lowerValue + (upperValue - lowerValue) * (index - lowerIndex);
}
