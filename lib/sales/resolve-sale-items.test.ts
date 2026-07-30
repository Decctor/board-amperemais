import assert from "node:assert/strict";
import test from "node:test";
import { collectStockShortages, resolveSaleItemCost, type TResolvedSaleItem } from "./resolve-sale-items";

test("custo da variante prevalece sobre o custo do produto", () => {
	assert.equal(resolveSaleItemCost(10, 7), 7);
});

test("custo do produto é usado quando a variante não possui custo", () => {
	assert.equal(resolveSaleItemCost(10, null), 10);
});

test("custo ausente é normalizado para zero", () => {
	assert.equal(resolveSaleItemCost(null, null), 0);
});

test("custo explicitamente zero continua válido", () => {
	assert.equal(resolveSaleItemCost(10, 0), 0);
});

function buildResolvedItem(overrides: Partial<TResolvedSaleItem>): TResolvedSaleItem {
	return {
		produtoId: "produto-1",
		produtoVarianteId: null,
		nome: "Chuveiro 127V",
		variacao: null,
		codigo: "CH127",
		imagemUrl: null,
		quantidade: 1,
		preco: 100,
		custo: 50,
		total: 100,
		custoTotal: 50,
		...overrides,
	};
}

const TRACKED_PRODUCT = { quantidade: 3, rastreamentoEstoqueAtivo: true, baixaEstoqueModo: "ESTOQUE_PROPRIO" as const };

test("saldo suficiente não gera falta", () => {
	const faltas = collectStockShortages({
		resolved: [buildResolvedItem({ quantidade: 3 })],
		productMap: new Map([["produto-1", TRACKED_PRODUCT]]),
		variantMap: new Map(),
	});
	assert.deepEqual(faltas, []);
});

test("pedido acima do saldo gera falta com os dois números", () => {
	const faltas = collectStockShortages({
		resolved: [buildResolvedItem({ quantidade: 5 })],
		productMap: new Map([["produto-1", TRACKED_PRODUCT]]),
		variantMap: new Map(),
	});
	assert.deepEqual(faltas, [{ nome: "Chuveiro 127V", solicitado: 5, disponivel: 3 }]);
});

test("linhas repetidas do mesmo item são somadas", () => {
	// Conferir linha por linha aprovaria 2 + 2 unidades de um item com 3 em estoque.
	const faltas = collectStockShortages({
		resolved: [buildResolvedItem({ quantidade: 2 }), buildResolvedItem({ quantidade: 2 })],
		productMap: new Map([["produto-1", TRACKED_PRODUCT]]),
		variantMap: new Map(),
	});
	assert.deepEqual(faltas, [{ nome: "Chuveiro 127V", solicitado: 4, disponivel: 3 }]);
});

test("item sem rastreamento nunca gera falta", () => {
	const faltas = collectStockShortages({
		resolved: [buildResolvedItem({ quantidade: 999 })],
		productMap: new Map([["produto-1", { quantidade: 0, rastreamentoEstoqueAtivo: false, baixaEstoqueModo: "ESTOQUE_PROPRIO" as const }]]),
		variantMap: new Map(),
	});
	assert.deepEqual(faltas, []);
});

test("produto em composição nunca gera falta", () => {
	const faltas = collectStockShortages({
		resolved: [buildResolvedItem({ quantidade: 999 })],
		productMap: new Map([["produto-1", { quantidade: 1, rastreamentoEstoqueAtivo: true, baixaEstoqueModo: "COMPOSICAO" as const }]]),
		variantMap: new Map(),
	});
	assert.deepEqual(faltas, []);
});

test("variações são conferidas separadamente e nomeadas com a variação", () => {
	const faltas = collectStockShortages({
		resolved: [
			buildResolvedItem({ produtoVarianteId: "variante-a", variacao: "127V", quantidade: 4 }),
			buildResolvedItem({ produtoVarianteId: "variante-b", variacao: "220V", quantidade: 1 }),
		],
		productMap: new Map([["produto-1", TRACKED_PRODUCT]]),
		variantMap: new Map([
			["variante-a", { quantidade: 2, rastreamentoEstoqueAtivo: true }],
			["variante-b", { quantidade: 9, rastreamentoEstoqueAtivo: true }],
		]),
	});
	assert.deepEqual(faltas, [{ nome: "Chuveiro 127V — 127V", solicitado: 4, disponivel: 2 }]);
});
