import assert from "node:assert/strict";
import test from "node:test";
import { blocksNewManualFiscalEmission } from "./manual-emission-policy";

test("permite reutilizar documentos com falha local ou rejeicao fiscal", () => {
	assert.equal(blocksNewManualFiscalEmission("ERRO"), false);
	assert.equal(blocksNewManualFiscalEmission("REJEITADO"), false);
});

test("permite nova emissao depois de encerramento definitivo", () => {
	assert.equal(blocksNewManualFiscalEmission("CANCELADO"), false);
	assert.equal(blocksNewManualFiscalEmission("INUTILIZADO"), false);
});

test("bloqueia documentos vivos e estados desconhecidos", () => {
	for (const status of ["RASCUNHO", "PRONTO_PARA_ENVIO", "EM_PROCESSAMENTO", "AUTORIZADO", "CANCELAMENTO_PENDENTE", null, "DESCONHECIDO"]) {
		assert.equal(blocksNewManualFiscalEmission(status), true, `status ${status}`);
	}
});

