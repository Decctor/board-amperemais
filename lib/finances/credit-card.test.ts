import assert from "node:assert/strict";
import { test } from "node:test";
import { getCreditCardForecastDate } from "./credit-card";

const config = { categoria: "CARTAO_CREDITO" as const, diaFechamentoFatura: 25, diaVencimentoFatura: 5 };

test("compra antes do fechamento vence no ciclo seguinte", () => {
	assert.equal(getCreditCardForecastDate(new Date("2026-08-10T12:00:00Z"), config).toISOString().slice(0, 10), "2026-09-05");
});

test("compra depois do fechamento pula para o vencimento posterior", () => {
	assert.equal(getCreditCardForecastDate(new Date("2026-08-26T12:00:00Z"), config).toISOString().slice(0, 10), "2026-10-05");
});

test("dias maiores que o mês são truncados para o último dia", () => {
	assert.equal(
		getCreditCardForecastDate(new Date("2026-01-10T12:00:00Z"), { ...config, diaVencimentoFatura: 31 })
			.toISOString()
			.slice(0, 10),
		"2026-01-31",
	);
});
