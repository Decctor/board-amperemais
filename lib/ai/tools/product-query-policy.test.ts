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

test("descarta a faixa quando nenhuma mensagem do cliente a justifica", () => {
	const normalized = normalizeProductQueryInput(
		{ termo: " chuveiro ", grupo: " ", faixaPreco: { max: 0.03, origem: "PEDIDA_PELO_CLIENTE" }, limite: 10 },
		["Quais opções de chuveiro 127V vocês têm?", "Boa noite"],
	);

	assert.deepEqual(normalized, {
		input: { termo: "chuveiro", grupo: undefined, faixaPreco: undefined, limite: 10 },
		faixaPrecoIgnorada: true,
	});
});

test("preserva a faixa explicitamente solicitada", () => {
	const normalized = normalizeProductQueryInput({ faixaPreco: { min: 100, max: 200, origem: "PEDIDA_PELO_CLIENTE" } }, [
		"Quero algo entre R$ 100 e R$ 200",
	]);

	assert.deepEqual(normalized.input.faixaPreco, { min: 100, max: 200, origem: "PEDIDA_PELO_CLIENTE" });
	assert.equal(normalized.faixaPrecoIgnorada, false);
});

test("preserva a faixa pedida em uma mensagem anterior da janela", () => {
	// O caso real que quebrava com janela de uma mensagem: o cliente dá o teto e, no turno
	// seguinte, apenas cobra a lista.
	const normalized = normalizeProductQueryInput({ faixaPreco: { max: 500, origem: "PEDIDA_PELO_CLIENTE" } }, [
		"Quais são ?",
		"Quero até 500 reais",
		"Pode ser o de 5500W",
	]);

	assert.deepEqual(normalized.input.faixaPreco, { min: undefined, max: 500, origem: "PEDIDA_PELO_CLIENTE" });
	assert.equal(normalized.faixaPrecoIgnorada, false);
});

test("não mexe na consulta quando não há faixa de preço", () => {
	const normalized = normalizeProductQueryInput({ termo: "chuveiro", limite: 20 }, ["Quanto custa um chuveiro?"]);

	assert.deepEqual(normalized, {
		input: { termo: "chuveiro", grupo: undefined, limite: 20 },
		faixaPrecoIgnorada: false,
	});
});
