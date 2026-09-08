import assert from "node:assert/strict";
import test from "node:test";
import { validateSalesSessionSeller } from "./validate-sales-session-seller";
import { summarizeSessionSalesBySeller } from "./summarize-session-sales-by-seller";

test("vendedor unico requires the configured seller", () => {
	assert.doesNotThrow(() =>
		validateSalesSessionSeller({ session: { politica: "VENDEDOR_UNICO", vendedorPadraoId: "seller-a" }, vendedorId: "seller-a" }),
	);
	assert.throws(() => validateSalesSessionSeller({ session: { politica: "VENDEDOR_UNICO", vendedorPadraoId: "seller-a" }, vendedorId: "seller-b" }));
	assert.throws(() => validateSalesSessionSeller({ session: { politica: "VENDEDOR_UNICO", vendedorPadraoId: "seller-a" }, vendedorId: null }));
});

test("multiple sellers policy does not substitute or restrict seller attribution", () => {
	assert.doesNotThrow(() =>
		validateSalesSessionSeller({ session: { politica: "VENDEDORES_MULTIPLOS", vendedorPadraoId: "seller-a" }, vendedorId: "seller-b" }),
	);
	assert.doesNotThrow(() =>
		validateSalesSessionSeller({ session: { politica: "VENDEDORES_MULTIPLOS", vendedorPadraoId: "seller-a" }, vendedorId: null }),
	);
});

test("seller breakdown is derived only from sales", () => {
	assert.deepEqual(
		summarizeSessionSalesBySeller([
			{ vendedorId: "seller-b", vendedorNome: "Bia", valorTotal: 20 },
			{ vendedorId: "seller-a", vendedorNome: "Ana", valorTotal: 10 },
			{ vendedorId: "seller-a", vendedorNome: "Ana", valorTotal: 15 },
		]),
		[
			{ vendedorId: "seller-a", vendedorNome: "Ana", quantidadeVendas: 2, valorTotal: 25 },
			{ vendedorId: "seller-b", vendedorNome: "Bia", quantidadeVendas: 1, valorTotal: 20 },
		],
	);
});
