import assert from "node:assert/strict";
import test from "node:test";
import { AiAgentCapacidadesSchema } from "./ai-agents";

test("capacidades antigas recebem os defaults comerciais", () => {
	const capabilities = AiAgentCapacidadesSchema.parse({ ferramentas: {} });
	assert.deepEqual(capabilities.comercial, {
		precos: { visiveis: true },
		orcamentos: { bloqueio: "TRANSFERIR" },
	});
	assert.equal(capabilities.ferramentas["orcamentos.criar"], undefined);
});

test("orçamento não pode ser habilitado com preços ocultos", () => {
	const result = AiAgentCapacidadesSchema.safeParse({
		ferramentas: {
			"orcamentos.criar": { habilitada: true },
			"atendimento.transferir_para_humano": { habilitada: true },
		},
		comercial: { precos: { visiveis: false } },
	});
	assert.equal(result.success, false);
});

test("política de transferência exige a ferramenta correspondente", () => {
	const result = AiAgentCapacidadesSchema.safeParse({
		ferramentas: { "orcamentos.criar": { habilitada: true } },
		comercial: {
			precos: { visiveis: true },
			orcamentos: { bloqueio: "TRANSFERIR" },
		},
	});
	assert.equal(result.success, false);
});

test("política de informar permite orçamento sem transferência", () => {
	const result = AiAgentCapacidadesSchema.safeParse({
		ferramentas: { "orcamentos.criar": { habilitada: true } },
		comercial: {
			precos: { visiveis: true },
			orcamentos: { bloqueio: "INFORMAR" },
		},
	});
	assert.equal(result.success, true);
});
