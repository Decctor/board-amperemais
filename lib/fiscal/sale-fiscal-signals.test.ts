import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAutoDocumentType, resolveExpectedConsumerPresenceCandidates } from "./sale-fiscal-signals";

/**
 * O indPres não é convenção nossa: é campo do leiaute com validação na SEFAZ. O valor 4
 * ("NFC-e em operação com entrega a domicílio") é exclusivo do modelo 65, e usá-lo numa NF-e
 * modelo 55 devolve a rejeição 794 — que foi exatamente como este caso apareceu, emitindo uma
 * venda de e-commerce com entrega. Estes testes fixam a separação por modelo.
 */

test("venda com entrega em NF-e prefere INTERNET (indPres=2)", () => {
	const candidates = resolveExpectedConsumerPresenceCandidates({
		canal: "mobile",
		entregaModalidade: "ENTREGA",
		tipoDocumento: "NFE",
	});
	assert.equal(candidates[0], "INTERNET");
	// ENTREGA_DOMICILIO permanece como fallback: quem só tem esse perfil continua resolvendo.
	assert.deepEqual(candidates, ["INTERNET", "ENTREGA_DOMICILIO"]);
});

test("venda com entrega em NFC-e mantém ENTREGA_DOMICILIO (indPres=4)", () => {
	// No modelo 65 o indPres=4 é o valor correto — a regra não pode inverter os dois casos.
	assert.deepEqual(resolveExpectedConsumerPresenceCandidates({ canal: "mobile", entregaModalidade: "ENTREGA", tipoDocumento: "NFCE" }), [
		"ENTREGA_DOMICILIO",
	]);
});

test("sem tipo de documento informado, entrega mantém o comportamento anterior", () => {
	assert.deepEqual(resolveExpectedConsumerPresenceCandidates({ canal: "mobile", entregaModalidade: "ENTREGA" }), ["ENTREGA_DOMICILIO"]);
});

test("modalidades não-entrega não mudam por modelo", () => {
	for (const tipoDocumento of ["NFE", "NFCE", undefined] as const) {
		assert.deepEqual(resolveExpectedConsumerPresenceCandidates({ entregaModalidade: "PRESENCIAL", tipoDocumento }), ["OPERACAO_PRESENCIAL"]);
		assert.deepEqual(resolveExpectedConsumerPresenceCandidates({ entregaModalidade: "COMANDA", tipoDocumento }), ["OPERACAO_PRESENCIAL"]);
	}
});

test("retirada pelo canal SHOP segue aceitando INTERNET", () => {
	assert.deepEqual(resolveExpectedConsumerPresenceCandidates({ canal: "SHOP", entregaModalidade: "RETIRADA" }), ["INTERNET", "OPERACAO_PRESENCIAL"]);
	assert.deepEqual(resolveExpectedConsumerPresenceCandidates({ canal: "mobile", entregaModalidade: "RETIRADA" }), ["OPERACAO_PRESENCIAL"]);
});

test("entrega e canal SHOP resolvem para NF-e", () => {
	// Contexto da regra acima: é o resolveAutoDocumentType que leva estas vendas ao modelo 55.
	assert.equal(resolveAutoDocumentType({ canal: "mobile", entregaModalidade: "ENTREGA" }), "NFE");
	assert.equal(resolveAutoDocumentType({ canal: "SHOP", entregaModalidade: "RETIRADA" }), "NFE");
	assert.equal(resolveAutoDocumentType({ canal: "mobile", entregaModalidade: "PRESENCIAL" }), "NFCE");
	// CNPJ no destinatário força NF-e independentemente da modalidade.
	assert.equal(resolveAutoDocumentType({ canal: "mobile", entregaModalidade: "PRESENCIAL", destinatarioCpfCnpj: "48.798.298/0001-53" }), "NFE");
});
