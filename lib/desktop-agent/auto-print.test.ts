import assert from "node:assert/strict";
import test from "node:test";
import { resolvePrintPolicyChannel } from "./auto-print";

test("normaliza canal iFood externo para a chave configurada na política", () => {
	assert.equal(resolvePrintPolicyChannel({ canal: "iFood", processamentoOrigem: "EXTERNO" }), "INTEGRACAO-IFOOD");
});

test("normaliza espaços e caixa de canais internos", () => {
	assert.equal(resolvePrintPolicyChannel({ canal: " pos ", processamentoOrigem: "INTERNO" }), "POS");
});

test("não cria chave para canal ausente ou vazio", () => {
	assert.equal(resolvePrintPolicyChannel({ canal: null, processamentoOrigem: "EXTERNO" }), null);
	assert.equal(resolvePrintPolicyChannel({ canal: "   ", processamentoOrigem: "EXTERNO" }), null);
});
