import assert from "node:assert/strict";
import test from "node:test";

import { getIbptRetryDelayMs, parseIbptApiPayload, refreshIbptUf } from "./ibpt-rates";

function buildItem(index: number) {
	return {
		codigo: String(index).padStart(8, "0"),
		tipo: 0,
		descricao: `NCM ${index}`,
		nacionalfederal: "15,65",
		importadosfederal: 27.41,
		estadual: 18,
		municipal: 0,
		vigenciainicio: "2026-08-20",
		vigenciafim: "2026-09-30",
		versao: "26.2.A",
		fonte: "IBPT",
	};
}

test("normaliza a tabela e mantém o último dia de vigência inteiro", () => {
	const snapshot = parseIbptApiPayload({ uf: "MG", versao: "26.2.A", ncm: [buildItem(1), buildItem(2)] }, "MG", {
		minimumRows: 2,
		now: new Date("2026-09-04T00:00:00.000Z"),
	});

	assert.equal(snapshot.rows.length, 2);
	assert.equal(snapshot.rows[0].ncm, "00000001");
	assert.equal(snapshot.rows[0].aliqNacionalFederal, 15.65);
	assert.equal(snapshot.vigenciaInicio.toISOString(), "2026-08-20T00:00:00.000Z");
	assert.equal(snapshot.vigenciaFim.toISOString(), "2026-09-30T23:59:59.999Z");
});

test("recusa resposta incompleta antes de substituir a tabela instalada", () => {
	assert.throws(
		() => parseIbptApiPayload({ uf: "MG", versao: "26.2.A", ncm: [buildItem(1)] }, "MG", { minimumRows: 2, now: new Date("2026-09-04T00:00:00.000Z") }),
		/Tabela IBPT de MG incompleta/,
	);
});

test("recusa resposta de outra UF", () => {
	assert.throws(
		() => parseIbptApiPayload({ uf: "PR", versao: "26.2.A", ncm: [buildItem(1)] }, "MG", { minimumRows: 1, now: new Date("2026-09-04T00:00:00.000Z") }),
		/retornou a UF PR ao consultar MG/,
	);
});

test("recusa tabela remota vencida", () => {
	assert.throws(
		() => parseIbptApiPayload({ uf: "MG", versao: "26.2.A", ncm: [buildItem(1)] }, "MG", { minimumRows: 1, now: new Date("2026-10-01T00:00:00.000Z") }),
		/tabela vencida/,
	);
});

test("backoff é exponencial", () => {
	assert.deepEqual([1, 2, 3].map(getIbptRetryDelayMs), [1_000, 2_000, 4_000]);
});

test("a atualização faz até três retentativas com backoff e se recupera na quarta chamada", async () => {
	let calls = 0;
	const waits: number[] = [];
	const payload = { uf: "MG", versao: "26.2.A", ncm: Array.from({ length: 10_000 }, (_, index) => buildItem(index)) };
	const fetcher = (async () => {
		calls += 1;
		if (calls < 4) throw new Error("indisponível");
		return { ok: true, json: async () => payload } as Response;
	}) as typeof fetch;

	const result = await refreshIbptUf({
		uf: "MG",
		apply: false,
		fetcher,
		now: new Date("2026-09-04T00:00:00.000Z"),
		sleepFn: async (ms) => {
			waits.push(ms);
		},
	});

	assert.equal(result.status, "VALIDADA");
	assert.equal(result.tentativas, 4);
	assert.equal(calls, 4);
	assert.deepEqual(waits, [1_000, 2_000, 4_000]);
});

test("a atualização devolve falha depois da chamada inicial e três retentativas", async () => {
	let calls = 0;
	const fetcher = (async () => {
		calls += 1;
		throw new Error("API fora do ar");
	}) as typeof fetch;

	const result = await refreshIbptUf({
		uf: "MG",
		apply: false,
		fetcher,
		now: new Date("2026-09-04T00:00:00.000Z"),
		sleepFn: async () => undefined,
	});

	assert.equal(result.status, "FALHA");
	assert.equal(result.tentativas, 4);
	assert.equal(calls, 4);
	if (result.status === "FALHA") assert.match(result.erro, /API fora do ar/);
});
