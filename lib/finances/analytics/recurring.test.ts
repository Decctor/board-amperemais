import assert from "node:assert/strict";
import test from "node:test";
import { computeRecurringMonthlyCommitments, getMonthlyOccurrencesFactor } from "./recurring";

test("normalizes occurrence frequency to a monthly factor", () => {
	assert.equal(getMonthlyOccurrencesFactor({ frequencia: "MENSAL", intervalo: 1 }), 1);
	assert.equal(getMonthlyOccurrencesFactor({ frequencia: "MENSAL", intervalo: 3 }), 1 / 3);
	assert.equal(getMonthlyOccurrencesFactor({ frequencia: "DIARIA", intervalo: 1 }), 30.44);
	assert.equal(getMonthlyOccurrencesFactor({ frequencia: "SEMANAL", intervalo: 1 }), 52.18 / 12);
	assert.equal(getMonthlyOccurrencesFactor({ frequencia: "ANUAL", intervalo: 2 }), 1 / 24);
});

test("sums monthly commitments by flow direction and skips expired rules", () => {
	const reference = new Date("2026-08-01T12:00:00.000Z");
	const { entradas, saidas } = computeRecurringMonthlyCommitments(
		[
			{
				config: { frequencia: "MENSAL", intervalo: 1, fim: null },
				templateTransacoes: [
					{ tipo: "ENTRADA", valor: 1000 },
					{ tipo: "SAIDA", valor: 300 },
				],
			},
			{
				config: { frequencia: "SEMANAL", intervalo: 1, fim: null },
				templateTransacoes: [{ tipo: "SAIDA", valor: 50 }],
			},
			{
				// Expirada antes da referência: ignorada por completo.
				config: { frequencia: "MENSAL", intervalo: 1, fim: new Date("2026-07-01T00:00:00.000Z") },
				templateTransacoes: [{ tipo: "SAIDA", valor: 9999 }],
			},
		],
		reference,
	);
	assert.equal(entradas, 1000);
	assert.equal(saidas, 300 + 50 * (52.18 / 12));
});
