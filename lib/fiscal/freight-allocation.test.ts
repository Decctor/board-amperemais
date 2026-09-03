import assert from "node:assert/strict";
import test from "node:test";
import { allocateFiscalFreight } from "./freight-allocation";

test("rateia o frete somente entre itens com valor liquido", () => {
	const result = allocateFiscalFreight({
		valorFrete: 7,
		itens: [
			{ valorBruto: 28, valorDesconto: 0 },
			{ valorBruto: 17, valorDesconto: 17 },
		],
	});

	assert.deepEqual(result, [7, 0]);
});

test("preserva exatamente os centavos do frete em rateios com arredondamento", () => {
	const result = allocateFiscalFreight({
		valorFrete: 0.02,
		itens: [
			{ valorBruto: 10, valorDesconto: 0 },
			{ valorBruto: 10, valorDesconto: 0 },
			{ valorBruto: 10, valorDesconto: 0 },
			{ valorBruto: 10, valorDesconto: 0 },
		],
	});

	assert.deepEqual(result, [0.01, 0.01, 0, 0]);
	assert.equal(
		result.reduce((sum, value) => sum + value, 0),
		0.02,
	);
});

test("usa o valor bruto quando todos os itens estao totalmente descontados", () => {
	const result = allocateFiscalFreight({
		valorFrete: 3,
		itens: [
			{ valorBruto: 10, valorDesconto: 10 },
			{ valorBruto: 20, valorDesconto: 20 },
		],
	});

	assert.deepEqual(result, [1, 2]);
});
