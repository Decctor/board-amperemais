import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyCashProjection, computeBurnAndRunway } from "./cash";

test("burn is the average negative net of the closed-month window; runway divides cash by burn", () => {
	const fluxosMensais = [
		{ mes: "2026-05", entradas: 1000, saidas: 1600, liquido: -600 },
		{ mes: "2026-06", entradas: 1000, saidas: 1300, liquido: -300 },
		// Mês sem linha conta como zero via divisão pela janela fixa (3), não pelo length.
	];
	const { mediaLiquidaMensal, queimaMensal, mesesDeCaixa } = computeBurnAndRunway({ fluxosMensais, totalCaixa: 900 });
	assert.equal(mediaLiquidaMensal, -300);
	assert.equal(queimaMensal, 300);
	assert.equal(mesesDeCaixa, 3);
});

test("positive average net means no burn and no runway", () => {
	const { queimaMensal, mesesDeCaixa } = computeBurnAndRunway({
		fluxosMensais: [{ mes: "2026-06", entradas: 500, saidas: 100, liquido: 400 }],
		totalCaixa: 900,
	});
	assert.equal(queimaMensal, 0);
	assert.equal(mesesDeCaixa, null);
});

test("projection allocates overdue flows to today and flags the first negative date", () => {
	const reference = new Date("2026-08-05T12:00:00.000Z");
	const projection = buildDailyCashProjection({
		horizonDays: 3,
		saldoInicial: 100,
		flows: [
			{ tipo: "SAIDA", valor: 50, dataPrevisao: new Date("2026-08-01T00:00:00.000Z") }, // vencida → hoje
			{ tipo: "SAIDA", valor: 80, dataPrevisao: new Date("2026-08-06T00:00:00.000Z") },
			{ tipo: "ENTRADA", valor: 40, dataPrevisao: new Date("2026-08-07T00:00:00.000Z") },
			{ tipo: "ENTRADA", valor: 999, dataPrevisao: new Date("2026-09-01T00:00:00.000Z") }, // fora do horizonte
		],
		referenceDate: reference,
	});

	assert.equal(projection.diaria.length, 4);
	assert.equal(projection.diaria[0].saidas, 50);
	assert.equal(projection.diaria[0].saldoProjetado, 50);
	assert.equal(projection.diaria[1].saldoProjetado, -30);
	assert.equal(projection.primeiraDataNegativa, projection.diaria[1].data);
	assert.equal(projection.saldoFinal, 10);
	assert.equal(projection.totalEntradasPrevistas, 40);
	assert.equal(projection.totalSaidasPrevistas, 130);
});
