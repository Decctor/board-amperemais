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

const AGENT_SCOPES = ["agent:results:read", "agent:clients:read", "agent:products:read", "agent:campaigns:read", "agent:sales:read"];
const PLATFORM_SCOPES = ["platform:organizations:read", "platform:metrics:read"];
const ALL_SCOPES = new Set([...AGENT_SCOPES, ...PLATFORM_SCOPES]);

test("sem scope nenhum, o ator não enxerga ferramenta alguma", () => {
	assert.deepEqual(listToolsForActor(createActor()), []);
});

test("cada scope revela apenas as suas ferramentas", () => {
	assert.deepEqual(
		listToolsForActor(createActor({ scopes: new Set(["agent:results:read"]) })).map((tool) => tool.name),
		["get_commercial_results"],
	);
	assert.deepEqual(
		listToolsForActor(createActor({ scopes: new Set(["agent:products:read"]) })).map((tool) => tool.name),
		["search_products", "get_product_performance"],
	);
});

test("nem todos os scopes fazem um ator ORG enxergar as ferramentas de plataforma", () => {
	// O caso que precisa nunca regredir: scope concedido a mais não pode atravessar o modo.
	const tools = listToolsForActor(createActor({ scopes: ALL_SCOPES }));
	assert.ok(tools.length > 0);
	assert.ok(
		tools.every((tool) => !tool.name.startsWith("platform_")),
		`vazou ferramenta de plataforma para modo ORG: ${tools.map((tool) => tool.name).join(", ")}`,
	);
});

test("o modo plataforma enxerga as ferramentas de organização e as de plataforma", () => {
	const tools = listToolsForActor(createActor({ mode: "PLATAFORMA", organizationId: null, scopes: ALL_SCOPES }));
	assert.equal(tools.length, listAllAgentTools().length);
	assert.ok(tools.some((tool) => tool.name.startsWith("platform_")));
	assert.ok(tools.some((tool) => tool.name === "get_commercial_results"));
});

test("scope de plataforma não abre ferramenta de plataforma em modo ORG", () => {
	const tools = listToolsForActor(createActor({ scopes: new Set(PLATFORM_SCOPES) }));
	assert.deepEqual(tools, []);
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

test("a descrição das ferramentas de organização ensina o organizacaoId só em modo plataforma", () => {
	const orgActor = createActor({ scopes: ALL_SCOPES });
	const platformActor = createActor({ mode: "PLATAFORMA", organizationId: null, scopes: ALL_SCOPES });

	// Só as ferramentas que existem nos dois modos: as de plataforma nunca são vistas em modo ORG,
	// e algumas delas (métricas agregadas, busca de organizações) não recebem organizacaoId nenhum.
	for (const tool of listAllAgentTools().filter((candidate) => candidate.modes.length > 1)) {
		assert.ok(tool.describe(platformActor).includes("organizacaoId"), `${tool.name} não explica organizacaoId em modo plataforma`);
		assert.ok(!tool.describe(orgActor).includes("organizacaoId"), `${tool.name} oferece organizacaoId em modo organização`);
	}
});

test("toda ferramenta de plataforma é exclusiva do modo plataforma e usa o prefixo platform_", () => {
	for (const tool of listAllAgentTools()) {
		const isPlatformScoped = tool.scopes.some((scope) => scope.startsWith("platform:"));
		assert.equal(isPlatformScoped, tool.name.startsWith("platform_"), `${tool.name}: prefixo e scope discordam`);
		if (isPlatformScoped) assert.deepEqual(tool.modes, ["PLATAFORMA"], `${tool.name} não é exclusiva do modo plataforma`);
	}
});

test("nenhum nome de ferramenta se repete no registro", () => {
	const names = listAllAgentTools().map((tool) => tool.name);
	assert.equal(new Set(names).size, names.length);
});
