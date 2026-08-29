import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_READ_ACCESS_SCOPES, NATIVE_ACCESS_CLIENTS, PLATFORM_AGENT_ACCESS_SCOPES, getDefaultAgentAccessScopes } from "./clients-catalog";

test("organization defaults include every organization read scope but no platform scope", () => {
	const scopes = getDefaultAgentAccessScopes({ isPlatform: false });
	assert.ok(scopes.includes("agent:sales:read"));
	assert.deepEqual(scopes, AGENT_READ_ACCESS_SCOPES);
	assert.ok(scopes.every((scope) => !scope.startsWith("platform:")));
});

test("platform defaults include organization and platform reads without PII", () => {
	const scopes = getDefaultAgentAccessScopes({ isPlatform: true });
	for (const scope of [...AGENT_READ_ACCESS_SCOPES, ...PLATFORM_AGENT_ACCESS_SCOPES]) assert.ok(scopes.includes(scope));
	assert.ok(!scopes.includes("agent:clients:pii"));
});

test("only AGENT_CONTROL has platform scopes in its client ceiling", () => {
	for (const client of NATIVE_ACCESS_CLIENTS) {
		const hasPlatformScope = client.escoposPermitidos.some((scope) => scope.startsWith("platform:"));
		assert.equal(hasPlatformScope, client.codigo === "AGENT_CONTROL", client.codigo);
	}
});
