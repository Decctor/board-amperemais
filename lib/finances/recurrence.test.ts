import assert from "node:assert/strict";
import { test } from "node:test";
import { getNextRecurringOccurrence, getRecurringOccurrencesUntil } from "./recurrence";

test("calcula recorrência mensal com dia 31 sem criar datas inválidas", () => {
	const config = {
		frequencia: "MENSAL" as const,
		intervalo: 1,
		inicio: new Date("2026-01-31T12:00:00Z"),
		fim: null,
		diaDoMes: 31,
		diaDaSemana: null,
		gerarComAntecedenciaDias: 90,
		timezone: "America/Sao_Paulo",
	};
	assert.equal(getNextRecurringOccurrence(new Date("2026-01-31T12:00:00Z"), config)?.toISOString().slice(0, 10), "2026-02-28");
});

test("gera somente ocorrências dentro do horizonte", () => {
	const config = {
		frequencia: "SEMANAL" as const,
		intervalo: 1,
		inicio: new Date("2026-08-03T12:00:00Z"),
		fim: null,
		diaDoMes: null,
		diaDaSemana: 1,
		gerarComAntecedenciaDias: 90,
		timezone: "America/Sao_Paulo",
	};
	assert.deepEqual(
		getRecurringOccurrencesUntil(config, new Date("2026-08-03T12:00:00Z"), new Date("2026-08-24T12:00:00Z")).map((date) =>
			date.toISOString().slice(0, 10),
		),
		["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"],
	);
});
