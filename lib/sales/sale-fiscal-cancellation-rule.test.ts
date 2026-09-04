import assert from "node:assert/strict";
import { test } from "node:test";
import { saleFiscalDocumentsAllowCancellation } from "@/lib/sales/sale-editability";

test("venda sem documentos ou so com documentos encerrados pode cancelar", () => {
	assert.equal(saleFiscalDocumentsAllowCancellation([]), true);
	assert.equal(
		saleFiscalDocumentsAllowCancellation([
			{ id: "a", statusInterno: "CANCELADO", documentoOrigemId: null },
			{ id: "b", statusInterno: "INUTILIZADO", documentoOrigemId: null },
		]),
		true,
	);
});

test("documento autorizado sem devolucao bloqueia", () => {
	assert.equal(saleFiscalDocumentsAllowCancellation([{ id: "a", statusInterno: "AUTORIZADO", documentoOrigemId: null }]), false);
	assert.equal(saleFiscalDocumentsAllowCancellation([{ id: "a", statusInterno: "EM_PROCESSAMENTO", documentoOrigemId: null }]), false);
	assert.equal(saleFiscalDocumentsAllowCancellation([{ id: "a", statusInterno: "REJEITADO", documentoOrigemId: null }]), false);
});

test("devolucao autorizada libera a original autorizada", () => {
	assert.equal(
		saleFiscalDocumentsAllowCancellation([
			{ id: "a", statusInterno: "AUTORIZADO", documentoOrigemId: null },
			{ id: "dev", statusInterno: "AUTORIZADO", documentoOrigemId: "a" },
		]),
		true,
	);
});

test("devolucao ainda nao autorizada nao libera", () => {
	assert.equal(
		saleFiscalDocumentsAllowCancellation([
			{ id: "a", statusInterno: "AUTORIZADO", documentoOrigemId: null },
			{ id: "dev", statusInterno: "EM_PROCESSAMENTO", documentoOrigemId: "a" },
		]),
		false,
	);
});
