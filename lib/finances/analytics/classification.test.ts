import assert from "node:assert/strict";
import test from "node:test";
import { accumulateCategoryTotals, buildCategoryTree, buildDreClassification, sumMapValues, type TDreChartAccount } from "./classification";

const chart: TDreChartAccount[] = [
	{ id: "rec", nome: "Receitas", natureza: "RECEITA", idContaPai: null },
	{ id: "rec-vendas", nome: "Vendas", natureza: "RECEITA", idContaPai: "rec" },
	{ id: "rec-vendas-loja", nome: "Vendas Loja", natureza: "RECEITA", idContaPai: "rec-vendas" },
	{ id: "rec-servicos", nome: "Serviços", natureza: "RECEITA", idContaPai: "rec" },
	{ id: "cus", nome: "Custos", natureza: "CUSTO", idContaPai: null },
	{ id: "cus-insumos", nome: "Insumos", natureza: "CUSTO", idContaPai: "cus" },
	{ id: "des", nome: "Despesas", natureza: "DESPESA", idContaPai: null },
	{ id: "des-aluguel", nome: "Aluguel", natureza: "DESPESA", idContaPai: "des" },
	// Sub-conta criada com pai de outra natureza: entra pela natureza própria, vira raiz da categoria.
	{ id: "des-orfa", nome: "Despesa órfã", natureza: "DESPESA", idContaPai: "rec" },
	{ id: "atv-caixa", nome: "Caixa", natureza: "ATIVO", idContaPai: null },
];

test("classifies accounts by natureza, not by ancestry", () => {
	const classification = buildDreClassification(chart);
	assert.ok(classification.revenueIds.has("rec-vendas-loja"));
	assert.ok(classification.expenseIds.has("des-orfa"));
	assert.ok(!classification.revenueIds.has("atv-caixa"));
	assert.ok(!classification.costIds.has("des-aluguel"));
});

test("accumulates revenue by credit side and cost/expense by debit side", () => {
	const classification = buildDreClassification(chart);
	const totals = accumulateCategoryTotals(
		[
			// Cada lançamento vira duas linhas: o crédito e o débito.
			{ contaId: "rec-vendas-loja", natureza: "CREDITO", total: 100 },
			{ contaId: "atv-caixa", natureza: "DEBITO", total: 100 },
			{ contaId: "atv-caixa", natureza: "CREDITO", total: 40 },
			{ contaId: "cus-insumos", natureza: "DEBITO", total: 40 },
			{ contaId: "atv-caixa", natureza: "CREDITO", total: 25 },
			{ contaId: "des-aluguel", natureza: "DEBITO", total: 25 },
			// Crédito em receita e débito em custo no mesmo lançamento contam nos dois lados.
			{ contaId: "rec-servicos", natureza: "CREDITO", total: 10 },
			{ contaId: "cus-insumos", natureza: "DEBITO", total: 10 },
		],
		classification,
	);
	assert.equal(sumMapValues(totals.revenueByAccount), 110);
	assert.equal(sumMapValues(totals.costByAccount), 50);
	assert.equal(sumMapValues(totals.expenseByAccount), 25);
});

test("rolls totals up to ancestors, prunes zero nodes, and sorts siblings desc", () => {
	const classification = buildDreClassification(chart);
	const tree = buildCategoryTree({
		categoryIds: classification.revenueIds,
		accountById: classification.accountById,
		currentTotals: new Map([
			["rec-vendas-loja", 100],
			["rec-servicos", 30],
		]),
		previousTotals: new Map([["rec-servicos", 45]]),
	});

	assert.equal(tree.length, 1);
	const root = tree[0];
	assert.equal(root.contaId, "rec");
	assert.equal(root.total, 130);
	assert.equal(root.totalAnterior, 45);
	// Vendas (100) antes de Serviços (30); "rec-vendas" agrega o lançamento do neto.
	assert.deepEqual(
		root.filhos.map((node) => [node.contaId, node.total]),
		[
			["rec-vendas", 100],
			["rec-servicos", 30],
		],
	);
	assert.equal(root.filhos[0].filhos[0].contaId, "rec-vendas-loja");
	// Nó com total zero nos dois períodos não aparece.
	assert.ok(!JSON.stringify(tree).includes("Conta desconhecida"));
});

test("treats accounts whose parent has another natureza as category roots", () => {
	const classification = buildDreClassification(chart);
	const tree = buildCategoryTree({
		categoryIds: classification.expenseIds,
		accountById: classification.accountById,
		currentTotals: new Map([
			["des-orfa", 10],
			["des-aluguel", 5],
		]),
		previousTotals: new Map(),
	});
	const rootIds = tree.map((node) => node.contaId).sort();
	assert.deepEqual(rootIds, ["des", "des-orfa"]);
});
