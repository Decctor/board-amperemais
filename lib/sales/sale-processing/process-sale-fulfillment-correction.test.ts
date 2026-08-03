import assert from "node:assert/strict";
import { test } from "node:test";
import { resolvePatchedFinancialAccountId } from "./process-sale-fulfillment-correction";

const CONTA_ESCOLHIDA_NO_PDV = "conta-b2b";
const CONTA_PADRAO_DO_METODO = "conta-padrao";

test("corrigir para o mesmo método preserva a conta escolhida no PDV", () => {
	const resolved = resolvePatchedFinancialAccountId({
		escolhaExplicita: null,
		contaResolvida: CONTA_PADRAO_DO_METODO,
		contaAtual: CONTA_ESCOLHIDA_NO_PDV,
		metodoInalterado: true,
	});
	assert.equal(resolved, CONTA_ESCOLHIDA_NO_PDV);
});

test("trocar de método cai na conta padrão do novo método", () => {
	const resolved = resolvePatchedFinancialAccountId({
		escolhaExplicita: null,
		contaResolvida: CONTA_PADRAO_DO_METODO,
		contaAtual: CONTA_ESCOLHIDA_NO_PDV,
		metodoInalterado: false,
	});
	assert.equal(resolved, CONTA_PADRAO_DO_METODO);
});

test("trocar para método sem conta padrão mantém a conta atual em vez de zerar", () => {
	const resolved = resolvePatchedFinancialAccountId({
		escolhaExplicita: null,
		contaResolvida: null,
		contaAtual: CONTA_ESCOLHIDA_NO_PDV,
		metodoInalterado: false,
	});
	assert.equal(resolved, CONTA_ESCOLHIDA_NO_PDV);
});

test("escolha explícita do operador prevalece sobre padrão e conta atual", () => {
	const resolved = resolvePatchedFinancialAccountId({
		escolhaExplicita: "conta-nova",
		contaResolvida: "conta-nova",
		contaAtual: CONTA_ESCOLHIDA_NO_PDV,
		metodoInalterado: false,
	});
	assert.equal(resolved, "conta-nova");
});
