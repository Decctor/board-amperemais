function toCents(value: number): number {
	return Math.max(0, Math.round((value + Number.EPSILON) * 100));
}

/**
 * Rateia o frete fiscal em centavos entre os itens que possuem valor liquido.
 *
 * A NF-e/NFC-e exige que o vFrete total corresponda a soma do vFrete dos itens. O metodo dos
 * maiores restos preserva a proporcao sem criar centavos negativos nem deixar diferenca de
 * arredondamento. Itens totalmente descontados nao recebem frete enquanto houver item pago.
 */
export function allocateFiscalFreight({
	valorFrete,
	itens,
}: {
	valorFrete: number;
	itens: { valorBruto: number; valorDesconto: number }[];
}): number[] {
	if (itens.length === 0) return [];

	const freightCents = toCents(valorFrete);
	if (freightCents === 0) return itens.map(() => 0);

	const netWeights = itens.map((item) => Math.max(0, item.valorBruto - item.valorDesconto));
	const netWeightTotal = netWeights.reduce((sum, weight) => sum + weight, 0);
	const grossWeights = itens.map((item) => Math.max(0, item.valorBruto));
	const grossWeightTotal = grossWeights.reduce((sum, weight) => sum + weight, 0);
	const weights = netWeightTotal > 0 ? netWeights : grossWeightTotal > 0 ? grossWeights : itens.map(() => 1);
	const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);

	const exactShares = weights.map((weight) => (freightCents * weight) / weightTotal);
	const allocatedCents = exactShares.map(Math.floor);
	let remainingCents = freightCents - allocatedCents.reduce((sum, value) => sum + value, 0);

	const remainderOrder = exactShares
		.map((share, index) => ({ index, remainder: share - Math.floor(share) }))
		.sort((a, b) => b.remainder - a.remainder || a.index - b.index);

	for (let index = 0; index < remainderOrder.length && remainingCents > 0; index += 1) {
		allocatedCents[remainderOrder[index].index] += 1;
		remainingCents -= 1;
	}

	return allocatedCents.map((value) => value / 100);
}
