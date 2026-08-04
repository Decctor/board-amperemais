import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAccountingDefaultAccountIdsAgainstChart } from "./resolve-accounting-default-accounts";

const CONTA_PERDAS = "conta-perdas-estoque";
const CONTA_ESTOQUES = "conta-estoques";

// Codigos do seed: perdas_estoque = 6.5, estoques = 1.3, fornecedores = 2.1.
const chartComContasDoSeed = new Map([
	["6.5", CONTA_PERDAS],
	["1.3", CONTA_ESTOQUES],
	["2.1", "conta-fornecedores"],
]);

test("prefere os IDs gravados na configuração da organização", () => {
	const resolved = resolveAccountingDefaultAccountIdsAgainstChart({
		defaults: {
			debitoContaId: "conta-custom-debito",
			debitoContaKey: "perdas_estoque",
			creditoContaId: "conta-custom-credito",
			creditoContaKey: "estoques",
		},
		kind: "perdasEstoque",
		accountIdByCode: chartComContasDoSeed,
	});
	assert.equal(resolved.debitAccountId, "conta-custom-debito");
	assert.equal(resolved.creditAccountId, "conta-custom-credito");
});

test("sem IDs gravados, resolve pela chave da configuração via código do seed", () => {
	const resolved = resolveAccountingDefaultAccountIdsAgainstChart({
		defaults: {
			debitoContaId: null,
			debitoContaKey: "perdas_estoque",
			creditoContaId: null,
			creditoContaKey: "estoques",
		},
		kind: "perdasEstoque",
		accountIdByCode: chartComContasDoSeed,
	});
	assert.equal(resolved.debitAccountId, CONTA_PERDAS);
	assert.equal(resolved.creditAccountId, CONTA_ESTOQUES);
});

test("sem bloco na configuração (organização antiga), cai nas chaves do seed do produto", () => {
	const resolved = resolveAccountingDefaultAccountIdsAgainstChart({
		defaults: undefined,
		kind: "perdasEstoque",
		accountIdByCode: chartComContasDoSeed,
	});
	assert.equal(resolved.debitAccountId, CONTA_PERDAS);
	assert.equal(resolved.creditAccountId, CONTA_ESTOQUES);
	assert.equal(resolved.debitKey, "perdas_estoque");
	assert.equal(resolved.creditKey, "estoques");
});

test("conta ausente no plano da organização volta null com a chave para provisionamento", () => {
	const resolved = resolveAccountingDefaultAccountIdsAgainstChart({
		defaults: undefined,
		kind: "perdasEstoque",
		accountIdByCode: new Map([["1.3", CONTA_ESTOQUES]]),
	});
	assert.equal(resolved.debitAccountId, null);
	assert.equal(resolved.debitKey, "perdas_estoque");
	assert.equal(resolved.creditAccountId, CONTA_ESTOQUES);
});

test("resolve compras pelas chaves do seed (estoques/fornecedores)", () => {
	const resolved = resolveAccountingDefaultAccountIdsAgainstChart({
		defaults: undefined,
		kind: "compras",
		accountIdByCode: chartComContasDoSeed,
	});
	assert.equal(resolved.debitAccountId, CONTA_ESTOQUES);
	assert.equal(resolved.creditAccountId, "conta-fornecedores");
});
