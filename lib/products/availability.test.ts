import assert from "node:assert/strict";
import test from "node:test";
import { resolveProductAvailability, resolveVariantAvailability } from "./availability";

test("sem rastreamento, o saldo é desconhecido e não zero", () => {
	// O caso que justifica o estado ternário: `quantidade: 0` com rastreamento desligado não é
	// falta, é ausência de controle. Reportar ESGOTADO aqui faria o agente negar um produto que a
	// empresa vende todo dia.
	for (const rastreamentoEstoqueAtivo of [false, null]) {
		assert.deepEqual(resolveProductAvailability({ quantidade: 0, rastreamentoEstoqueAtivo }), {
			disponibilidade: "NAO_RASTREADO",
			quantidade: null,
		});
	}
});

test("sem rastreamento, um saldo positivo também não é afirmado", () => {
	assert.deepEqual(resolveProductAvailability({ quantidade: 42, rastreamentoEstoqueAtivo: false }), {
		disponibilidade: "NAO_RASTREADO",
		quantidade: null,
	});
});

test("com rastreamento, o saldo decide", () => {
	assert.deepEqual(resolveProductAvailability({ quantidade: 3, rastreamentoEstoqueAtivo: true }), {
		disponibilidade: "DISPONIVEL",
		quantidade: 3,
	});
	assert.deepEqual(resolveProductAvailability({ quantidade: 0, rastreamentoEstoqueAtivo: true }), {
		disponibilidade: "ESGOTADO",
		quantidade: 0,
	});
});

test("saldo nulo com rastreamento ligado conta como zero", () => {
	// Espelha o `COALESCE(quantidade, 0)` de `applyStockMovement`: a coluna só fica nula em produto
	// que nunca movimentou.
	assert.deepEqual(resolveProductAvailability({ quantidade: null, rastreamentoEstoqueAtivo: true }), {
		disponibilidade: "ESGOTADO",
		quantidade: 0,
	});
});

test("saldo negativo é falta, não disponibilidade", () => {
	assert.deepEqual(resolveProductAvailability({ quantidade: -2, rastreamentoEstoqueAtivo: true }), {
		disponibilidade: "ESGOTADO",
		quantidade: -2,
	});
});

test("composição nunca afirma falta, mesmo com rastreamento ligado", () => {
	// Prato/drink: a quantidade própria não significa nada, a disponibilidade real depende dos
	// insumos da ficha técnica — que esta versão não explode.
	assert.deepEqual(resolveProductAvailability({ quantidade: 0, rastreamentoEstoqueAtivo: true, baixaEstoqueModo: "COMPOSICAO" }), {
		disponibilidade: "NAO_RASTREADO",
		quantidade: null,
	});
});

test("estoque próprio segue a regra normal", () => {
	assert.deepEqual(resolveProductAvailability({ quantidade: 5, rastreamentoEstoqueAtivo: true, baixaEstoqueModo: "ESTOQUE_PROPRIO" }), {
		disponibilidade: "DISPONIVEL",
		quantidade: 5,
	});
});

test("a variação usa o próprio saldo e herda o modo de baixa do produto", () => {
	assert.deepEqual(resolveVariantAvailability({ quantidade: 7, rastreamentoEstoqueAtivo: true }, { baixaEstoqueModo: "ESTOQUE_PROPRIO" }), {
		disponibilidade: "DISPONIVEL",
		quantidade: 7,
	});
	// Produto em composição arrasta as variações: o saldo da variação não representa o prato montado.
	assert.deepEqual(resolveVariantAvailability({ quantidade: 7, rastreamentoEstoqueAtivo: true }, { baixaEstoqueModo: "COMPOSICAO" }), {
		disponibilidade: "NAO_RASTREADO",
		quantidade: null,
	});
});

test("variação sem rastreamento não herda o saldo do produto", () => {
	assert.deepEqual(resolveVariantAvailability({ quantidade: 0, rastreamentoEstoqueAtivo: false }, { baixaEstoqueModo: "ESTOQUE_PROPRIO" }), {
		disponibilidade: "NAO_RASTREADO",
		quantidade: null,
	});
});
