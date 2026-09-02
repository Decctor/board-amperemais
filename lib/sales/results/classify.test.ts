import assert from "node:assert/strict";
import test from "node:test";
import { classifyFiscalLifecycleStatus, computeAverage, computeGoalAttainment, computeShare } from "./classify";

test("classifies every internal fiscal lifecycle status into a health bucket", () => {
	assert.equal(classifyFiscalLifecycleStatus("AUTORIZADO"), "AUTORIZADA");
	assert.equal(classifyFiscalLifecycleStatus("REJEITADO"), "REJEITADA");
	assert.equal(classifyFiscalLifecycleStatus("ERRO"), "REJEITADA");
	assert.equal(classifyFiscalLifecycleStatus("CANCELADO"), "CANCELADA");
	assert.equal(classifyFiscalLifecycleStatus("INUTILIZADO"), "CANCELADA");
	for (const status of ["RASCUNHO", "PRONTO_PARA_ENVIO", "EM_PROCESSAMENTO", "CANCELAMENTO_PENDENTE"] as const) {
		assert.equal(classifyFiscalLifecycleStatus(status), "PENDENTE");
	}
});

test("share and averages do not divide by zero", () => {
	assert.equal(computeShare(25, 100), 25);
	assert.equal(computeShare(25, 0), 0);
	assert.equal(computeAverage(300, 3), 100);
	assert.equal(computeAverage(0, 0), null);
});

test("goal attainment is null without a goal", () => {
	assert.equal(computeGoalAttainment(50, 200), 25);
	assert.equal(computeGoalAttainment(50, 0), null);
});
