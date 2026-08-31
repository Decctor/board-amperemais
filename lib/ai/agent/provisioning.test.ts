import assert from "node:assert/strict";
import test from "node:test";
import { buildDefaultAgentInstructions } from "./provisioning";

test("default exige destino antes de fechar um pedido para entrega", () => {
	const instructions = buildDefaultAgentInstructions("Empresa Teste");

	assert.match(instructions, /obtenha o endereço ou local de destino antes de confirmar o fechamento/);
	assert.match(instructions, /enquanto o destino ainda não estiver claro/);
});

test("default transfere quando a política de pagamento não está documentada", () => {
	const instructions = buildDefaultAgentInstructions("Empresa Teste");

	assert.match(instructions, /não invente uma condição: transfira imediatamente para um/);
	assert.match(instructions, /atendente humano/);
});
