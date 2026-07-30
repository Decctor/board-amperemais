import assert from "node:assert/strict";
import test from "node:test";
import { hasDeferredActionPromise, shouldRetryDeferredAction } from "./turn-validation";

test("detecta promessa futura sem confundir pergunta ao cliente", () => {
	assert.equal(hasDeferredActionPromise("Vou criar o orçamento agora."), true);
	assert.equal(hasDeferredActionPromise("Um momento que já te envio."), true);
	assert.equal(hasDeferredActionPromise("Quer que eu crie um orçamento?"), false);
});

test("só pede retry quando nenhuma ferramenta foi chamada", () => {
	assert.equal(shouldRetryDeferredAction("Vou consultar agora.", []), true);
	assert.equal(shouldRetryDeferredAction("Vou consultar agora.", ["produtos_consultar"]), false);
	assert.equal(shouldRetryDeferredAction("Vou criar o orçamento agora.", ["produtos_consultar"]), true);
	assert.equal(shouldRetryDeferredAction("Vou criar o orçamento agora.", ["orcamentos_criar"]), false);
});
