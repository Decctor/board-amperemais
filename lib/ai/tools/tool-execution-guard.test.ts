import assert from "node:assert/strict";
import test from "node:test";
import { createAgentToolExecutionGuard } from "./tool-execution-guard";

test("reutiliza a primeira chamada idêntica sem executar novamente", async () => {
	const guard = createAgentToolExecutionGuard(5);
	let executions = 0;
	const execute = async () => {
		executions += 1;
		return { success: true, message: "ok", result: { value: 1 } };
	};

	const first = await guard("produtos:abc", execute);
	const second = await guard("produtos:abc", execute);

	assert.deepEqual(second, first);
	assert.equal(executions, 1);
});

test("bloqueia a terceira tentativa idêntica", async () => {
	const guard = createAgentToolExecutionGuard(5);
	const execute = async () => ({ success: true, message: "ok" });

	await guard("produtos:abc", execute);
	await guard("produtos:abc", execute);
	const third = await guard("produtos:abc", execute);

	assert.equal(third.success, false);
	assert.deepEqual(third.result, { codigo: "CONSULTA_REPETIDA" });
});

test("aplica o limite sobre execuções reais", async () => {
	const guard = createAgentToolExecutionGuard(1);
	const execute = async () => ({ success: true, message: "ok" });

	await guard("produtos:a", execute);
	const blocked = await guard("produtos:b", execute);

	assert.equal(blocked.success, false);
	assert.deepEqual(blocked.result, { codigo: "LIMITE_CHAMADAS_ATINGIDO" });
});
