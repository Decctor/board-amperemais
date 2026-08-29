import assert from "node:assert/strict";
import test from "node:test";
import { canReadClientPii, maskSensitiveValue, resolveOrganizationScope } from "./organization-scope";
import type { TAgentActorContext } from "./types";

function createActor(overrides: Partial<TAgentActorContext> = {}): TAgentActorContext {
	return {
		mode: "ORG",
		principalId: "principal-1",
		credentialId: "credential-1",
		clientId: "client-1",
		clientCode: "claude",
		organizationId: "org-1",
		scopes: new Set(["agent:results:read"]),
		...overrides,
		responsibleUserId: overrides.responsibleUserId === undefined ? "user-1" : overrides.responsibleUserId,
	};
}

test("modo ORG ignora a ausência de organizacaoId e usa a do principal", async () => {
	const organizationId = await resolveOrganizationScope(createActor(), null);
	assert.equal(organizationId, "org-1");
});

test("modo ORG aceita o próprio organizacaoId informado redundantemente", async () => {
	const organizationId = await resolveOrganizationScope(createActor(), "org-1");
	assert.equal(organizationId, "org-1");
});

test("modo ORG recusa organizacaoId de outra organização", async () => {
	// O caso que precisa nunca regredir: o modelo pedindo dados de outro tenant.
	await assert.rejects(() => resolveOrganizationScope(createActor(), "org-2"), /própria organização/);
});

test("modo ORG trata string em branco como ausência, não como outra organização", async () => {
	const organizationId = await resolveOrganizationScope(createActor(), "   ");
	assert.equal(organizationId, "org-1");
});

test("modo PLATAFORMA exige organizacaoId explícito", async () => {
	// Omitir o argumento não pode virar "todas as organizações": modelos omitem opcional o tempo todo.
	await assert.rejects(() => resolveOrganizationScope(createActor({ mode: "PLATAFORMA", organizationId: null }), null), /organizacaoId/);
});

test("PII exige o scope dedicado", () => {
	assert.equal(canReadClientPii(createActor()), false);
	assert.equal(canReadClientPii(createActor({ scopes: new Set(["agent:clients:read", "agent:clients:pii"]) })), true);
});

test("mascaramento preserva o sufixo e nunca vaza o começo do valor", () => {
	const masked = maskSensitiveValue("11987654321");
	assert.equal(masked, "•••••••4321");
	assert.ok(!masked?.includes("1198"));
	assert.equal(maskSensitiveValue(null), null);
	// Valor curto some por inteiro em vez de virar quase-texto-claro.
	assert.equal(maskSensitiveValue("123"), "•••");
});
