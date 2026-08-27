import assert from "node:assert/strict";
import test from "node:test";
import { findToolForActor, listAllAgentTools, listToolsForActor } from "./registry";
import type { TAgentActorContext } from "./types";

function createActor(overrides: Partial<TAgentActorContext> = {}): TAgentActorContext {
	return {
		mode: "ORG",
		principalId: "principal-1",
		credentialId: "credential-1",
		clientId: "client-1",
		clientCode: "claude",
		organizationId: "org-1",
		scopes: new Set<string>(),
		...overrides,
	};
}

const ALL_SCOPES = new Set(["agent:results:read", "agent:clients:read", "agent:products:read", "agent:campaigns:read"]);

test("sem scope nenhum, o ator não enxerga ferramenta alguma", () => {
	assert.deepEqual(listToolsForActor(createActor()), []);
});

test("cada scope revela apenas a sua ferramenta", () => {
	const tools = listToolsForActor(createActor({ scopes: new Set(["agent:results:read"]) }));
	assert.deepEqual(
		tools.map((tool) => tool.name),
		["get_commercial_results"],
	);
});

test("com todos os scopes, o ator enxerga todo o registro", () => {
	const tools = listToolsForActor(createActor({ scopes: ALL_SCOPES }));
	assert.equal(tools.length, listAllAgentTools().length);
});

test("scope parecido não conta — a correspondência é por igualdade exata", () => {
	// Sem wildcards, como nos grants de dispositivo: "agent:clients" não abre "agent:clients:read".
	const tools = listToolsForActor(createActor({ scopes: new Set(["agent:clients", "agent:*"]) }));
	assert.deepEqual(tools, []);
});

test("scope de PII sozinho não abre a busca de clientes", () => {
	const tools = listToolsForActor(createActor({ scopes: new Set(["agent:clients:pii"]) }));
	assert.deepEqual(tools, []);
});

test("findToolForActor recusa ferramenta fora dos scopes concedidos", () => {
	// Segunda barreira: o cliente pode ter cacheado uma lista de antes da revogação do grant.
	assert.equal(findToolForActor(createActor({ scopes: ALL_SCOPES }), "get_commercial_results")?.name, "get_commercial_results");
	assert.equal(findToolForActor(createActor({ scopes: new Set(["agent:products:read"]) }), "get_commercial_results"), null);
	assert.equal(findToolForActor(createActor({ scopes: ALL_SCOPES }), "ferramenta_inexistente"), null);
});

test("toda ferramenta declara ao menos um scope e ao menos um modo", () => {
	// Uma ferramenta sem scope passaria pelo filtro `.every()` de qualquer conexão autenticada.
	for (const tool of listAllAgentTools()) {
		assert.ok(tool.scopes.length > 0, `${tool.name} não declara scope`);
		assert.ok(tool.modes.length > 0, `${tool.name} não declara modo`);
	}
});

test("a descrição muda com o modo e ensina o organizacaoId só onde ele existe", () => {
	const orgActor = createActor({ scopes: ALL_SCOPES });
	const platformActor = createActor({ mode: "PLATAFORMA", organizationId: null, scopes: ALL_SCOPES });

	for (const tool of listAllAgentTools()) {
		const orgDescription = tool.describe(orgActor);
		const platformDescription = tool.describe(platformActor);
		assert.ok(platformDescription.includes("organizacaoId"), `${tool.name} não explica organizacaoId em modo plataforma`);
		assert.ok(!orgDescription.includes("organizacaoId"), `${tool.name} oferece organizacaoId em modo organização`);
	}
});
