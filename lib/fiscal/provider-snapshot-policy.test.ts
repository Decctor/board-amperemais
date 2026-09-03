import assert from "node:assert/strict";
import test from "node:test";
import { shouldApplyProviderSnapshot, shouldReplaceActionableRejection } from "./provider-snapshot-policy";

test("nao regride documento autorizado por webhook atrasado", () => {
	assert.equal(
		shouldApplyProviderSnapshot({
			current: { statusInterno: "AUTORIZADO", provedorProcessadoEm: new Date("2026-09-03T12:00:00Z") },
			incoming: { statusInterno: "EM_PROCESSAMENTO", provedorProcessadoEm: new Date("2026-09-03T11:59:00Z") },
		}),
		false,
	);
});

test("permite cancelamento posterior de documento autorizado", () => {
	assert.equal(
		shouldApplyProviderSnapshot({
			current: { statusInterno: "AUTORIZADO" },
			incoming: { statusInterno: "CANCELADO" },
		}),
		true,
	);
});

test("nao troca rejeicao acionavel por rejeicao secundaria 217", () => {
	assert.equal(
		shouldReplaceActionableRejection({ currentCode: "786", incomingCode: "217", incomingMessages: ["Nao consta"] }),
		false,
	);
});

test("aceita uma nova rejeicao acionavel", () => {
	assert.equal(
		shouldReplaceActionableRejection({ currentCode: "786", incomingCode: "215", incomingMessages: ["Falha no schema"] }),
		true,
	);
});
