import assert from "node:assert/strict";
import test from "node:test";
import { hasExplicitPriceRange, normalizeProductQueryInput } from "./product-query-policy";

test("reconhece pedidos explícitos de faixa de preço", () => {
	for (const message of ["Quero gastar até R$ 300", "Tem algo entre 100 e 200 reais?", "Tenho 250 reais", "Quero acima de R$ 50"]) {
		assert.equal(hasExplicitPriceRange(message), true, message);
	}
});

test("não confunde pedido de preço com pedido de faixa", () => {
	for (const message of ["Quanto custa um chuveiro?", "Quais os valores?", "Me envie opções com preço"]) {
		assert.equal(hasExplicitPriceRange(message), false, message);
	}
});

test("remove qualquer preço inventado quando o cliente não pediu faixa", () => {
	const normalized = normalizeProductQueryInput(
		{ termo: " chuveiro ", grupo: " ", precoMin: 0, precoMax: 0.01, limite: 10 },
		"Quais opções de chuveiro 127V vocês têm?",
	);

	assert.deepEqual(normalized, {
		input: { termo: "chuveiro", grupo: undefined, precoMin: undefined, precoMax: undefined, limite: 10 },
		filtrosIgnorados: ["precoMin", "precoMax"],
	});
});

test("preserva a faixa explicitamente solicitada", () => {
	const normalized = normalizeProductQueryInput({ precoMin: 100, precoMax: 200 }, "Quero algo entre R$ 100 e R$ 200");
	assert.deepEqual(normalized.input, { precoMin: 100, precoMax: 200, termo: undefined, grupo: undefined });
	assert.deepEqual(normalized.filtrosIgnorados, []);
});

test("recusa faixa invertida", () => {
	assert.throws(
		() => normalizeProductQueryInput({ precoMin: 300, precoMax: 100 }, "Quero algo entre 100 e 300 reais"),
		/O preço mínimo não pode ser maior/,
	);
});
