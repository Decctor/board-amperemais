import assert from "node:assert/strict";
import test from "node:test";
import { hashAgentOperationInput } from "./hash";

test("hash de operação ignora a ordem das chaves dos objetos", () => {
	const left = hashAgentOperationInput({ observacoes: "teste", itens: [{ quantidade: 2, produtoId: "produto-1" }] });
	const right = hashAgentOperationInput({ itens: [{ produtoId: "produto-1", quantidade: 2 }], observacoes: "teste" });
	assert.equal(left, right);
});

test("hash de operação diferencia payloads comercialmente distintos", () => {
	const oneUnit = hashAgentOperationInput({ itens: [{ produtoId: "produto-1", quantidade: 1 }] });
	const twoUnits = hashAgentOperationInput({ itens: [{ produtoId: "produto-1", quantidade: 2 }] });
	assert.notEqual(oneUnit, twoUnits);
});
