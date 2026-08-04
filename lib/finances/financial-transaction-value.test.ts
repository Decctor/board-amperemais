import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateFinancialTransactionTotal, normalizeFinancialTransactionValue } from "./financial-transaction-value";

test("calcula o total a partir dos modificadores monetários", () => {
	assert.equal(calculateFinancialTransactionTotal({ valorBase: 100, valorJuros: 5, valorMulta: 2, valorTaxas: 3, valorDesconto: 10 }), 100);
});

test("mantém compatibilidade com transação que informa apenas o total", () => {
	assert.deepEqual(normalizeFinancialTransactionValue({ valor: 125.5 }), {
		valor: 125.5,
		valorBase: 125.5,
		valorJuros: 0,
		valorMulta: 0,
		valorTaxas: 0,
		valorDesconto: 0,
		modificadoresMetadata: null,
	});
});

test("fecha a equação com juros, taxas e desconto", () => {
	assert.deepEqual(normalizeFinancialTransactionValue({ valor: 110, valorBase: 100, valorJuros: 5, valorTaxas: 10, valorDesconto: 5 }), {
		valor: 110,
		valorBase: 100,
		valorJuros: 5,
		valorMulta: 0,
		valorTaxas: 10,
		valorDesconto: 5,
		modificadoresMetadata: null,
	});
});

test("rejeita modificadores que não fecham o total", () => {
	assert.throws(() => normalizeFinancialTransactionValue({ valor: 100, valorBase: 80, valorJuros: 5 }));
});
