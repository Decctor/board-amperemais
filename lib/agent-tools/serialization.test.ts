import assert from "node:assert/strict";
import test from "node:test";
import { roundForModel, sanitizeForModel } from "./serialization";

test("campo nulo é removido em vez de virar null", () => {
	// A regra central: `preco: null` chega ao modelo como zero, e o zero inventado é o bug.
	const result = sanitizeForModel({ nome: "Café", precoVenda: null, quantidade: undefined }) as Record<string, unknown>;
	assert.deepEqual(result, { nome: "Café" });
	assert.ok(!("precoVenda" in result));
});

test("NaN e Infinity são removidos, não serializados como null", () => {
	// Vêm das agregações em período sem venda (ticket médio = total / 0). Sem esta passada,
	// `JSON.stringify` os transformaria justamente no null que a regra acima existe para evitar.
	const result = sanitizeForModel({ ticketMedio: Number.NaN, crescimento: Number.POSITIVE_INFINITY, faturamento: 0 });
	assert.deepEqual(result, { faturamento: 0 });
});

test("zero legítimo é preservado", () => {
	// Zero medido é informação; a regra remove o desconhecido, não o zero.
	assert.deepEqual(sanitizeForModel({ qtdeVendas: 0, ativo: false }), { qtdeVendas: 0, ativo: false });
});

test("datas viram ISO 8601", () => {
	const result = sanitizeForModel({ dataVenda: new Date("2026-03-15T12:00:00.000Z") }) as Record<string, unknown>;
	assert.equal(result.dataVenda, "2026-03-15T12:00:00.000Z");
});

test("limpeza é recursiva em objetos e listas", () => {
	const result = sanitizeForModel({
		clientes: [
			{ nome: "Ana", telefone: null },
			{ nome: "Beto", ticketMedio: Number.NaN },
		],
		meta: { objetivo: 1000, atingidoPercentual: null },
	});
	assert.deepEqual(result, {
		clientes: [{ nome: "Ana" }, { nome: "Beto" }],
		meta: { objetivo: 1000 },
	});
});

test("item nulo some da lista em vez de virar buraco", () => {
	assert.deepEqual(sanitizeForModel([1, null, 2, Number.NaN]), [1, 2]);
});

test("roundForModel corta a precisão falsa e descarta o que não é número", () => {
	assert.equal(roundForModel(1234.56789), 1234.57);
	assert.equal(roundForModel(1234.56789, 0), 1235);
	assert.equal(roundForModel(null), undefined);
	assert.equal(roundForModel(Number.NaN), undefined);
});
