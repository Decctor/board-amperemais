import assert from "node:assert/strict";
import { test } from "node:test";
import {
	buildGoalPacingCurve,
	buildGoalPacingSeries,
	countPeriodDays,
	GOAL_PACING_FULL_HISTORY_SAMPLE,
	indexDailyAchievement,
	resolveGoalPacing,
	resolveGoalShareForWindow,
	resolveWeekdayWeightBlend,
	resolveWeekWindow,
	type TGoalDailyAchievement,
} from "./pacing";

/** Agosto de 2026 começa num sábado e tem 31 dias — cinco sábados e cinco domingos. */
const AGOSTO_INICIO = new Date(2026, 7, 1);
const AGOSTO_FIM = new Date(2026, 7, 31);

const OBJETIVOS = { objetivoValor: 100_000, objetivoQtdeVendas: 200, objetivoNovosClientes: 40 };

function emptyAchievement(): Map<string, TGoalDailyAchievement> {
	return new Map();
}

function linearCurve() {
	return buildGoalPacingCurve({ dataInicio: AGOSTO_INICIO, dataFim: AGOSTO_FIM, pesosPorDiaSemana: null, totalVendasHistorico: 0 });
}

test("curva sem histórico distribui igualmente e se declara LINEAR", () => {
	const curva = linearCurve();

	assert.equal(curva.dias.length, 31);
	assert.equal(curva.origemDistribuicao, "LINEAR");
	for (const dia of curva.dias) assert.ok(Math.abs(dia.peso - 1 / 31) < 1e-12);
	assert.ok(Math.abs((curva.dias.at(-1)?.pesoAcumulado ?? 0) - 1) < 1e-12);
});

test("alpha zero é idêntico ao linear, ainda que existam pesos históricos", () => {
	const pesos = [0, 0.1, 0.15, 0.15, 0.2, 0.2, 0.2];
	const curva = buildGoalPacingCurve({
		dataInicio: AGOSTO_INICIO,
		dataFim: AGOSTO_FIM,
		pesosPorDiaSemana: pesos,
		totalVendasHistorico: 0,
	});
	const linear = linearCurve();

	assert.equal(curva.origemDistribuicao, "LINEAR");
	curva.dias.forEach((dia, index) => assert.ok(Math.abs(dia.peso - (linear.dias[index]?.peso ?? 0)) < 1e-12));
});

test("loja fechada no domingo zera o peso do domingo e mantém a soma em 1", () => {
	// Domingo sem faturamento, os outros seis dias iguais.
	const pesos = [0, 1, 1, 1, 1, 1, 1];
	const curva = buildGoalPacingCurve({
		dataInicio: AGOSTO_INICIO,
		dataFim: AGOSTO_FIM,
		pesosPorDiaSemana: pesos,
		totalVendasHistorico: GOAL_PACING_FULL_HISTORY_SAMPLE,
	});

	assert.equal(curva.origemDistribuicao, "HISTORICO");
	const domingos = curva.dias.filter((dia) => dia.dia.getDay() === 0);
	assert.equal(domingos.length, 5);
	for (const domingo of domingos) assert.equal(domingo.peso, 0);

	const soma = curva.dias.reduce((acc, dia) => acc + dia.peso, 0);
	assert.ok(Math.abs(soma - 1) < 1e-12);
});

test("os pesos são renormalizados sobre os dias do período, não sobre a semana", () => {
	// Sábado vale o dobro de todo mundo. Agosto/2026 tem cinco sábados.
	const pesos = [1, 1, 1, 1, 1, 1, 2];
	const curva = buildGoalPacingCurve({
		dataInicio: AGOSTO_INICIO,
		dataFim: AGOSTO_FIM,
		pesosPorDiaSemana: pesos,
		totalVendasHistorico: GOAL_PACING_FULL_HISTORY_SAMPLE,
	});

	const sabado = curva.dias.find((dia) => dia.dia.getDay() === 6);
	const segunda = curva.dias.find((dia) => dia.dia.getDay() === 1);
	assert.ok(sabado && segunda);
	assert.ok(Math.abs(sabado.peso / segunda.peso - 2) < 1e-12);

	const soma = curva.dias.reduce((acc, dia) => acc + dia.peso, 0);
	assert.ok(Math.abs(soma - 1) < 1e-12);
});

test("amostra parcial encolhe em direção ao uniforme", () => {
	const pesos = [0, 0, 0, 0, 0, 0, 1];
	const { pesos: misturados, alpha } = resolveWeekdayWeightBlend({
		pesosPorDiaSemana: pesos,
		totalVendas: GOAL_PACING_FULL_HISTORY_SAMPLE / 2,
	});

	assert.ok(Math.abs(alpha - 0.5) < 1e-12);
	// Metade uniforme, metade histórico: nenhum dia zera com amostra fraca.
	assert.ok(Math.abs((misturados[0] ?? 0) - 0.5 * (1 / 7)) < 1e-12);
	assert.ok(Math.abs((misturados[6] ?? 0) - (0.5 + 0.5 * (1 / 7))) < 1e-12);
});

test("meta de um único dia concentra todo o objetivo nele", () => {
	const curva = buildGoalPacingCurve({
		dataInicio: AGOSTO_INICIO,
		dataFim: AGOSTO_INICIO,
		pesosPorDiaSemana: null,
		totalVendasHistorico: 0,
	});

	assert.equal(curva.dias.length, 1);
	assert.equal(curva.dias[0]?.peso, 1);

	const pacing = resolveGoalPacing({ curva, objetivos: OBJETIVOS, realizadoPorDia: emptyAchievement(), agora: AGOSTO_INICIO });
	assert.equal(pacing.metaDia?.valor, 100_000);
});

test("período invertido devolve curva vazia em vez de estourar", () => {
	const curva = buildGoalPacingCurve({
		dataInicio: AGOSTO_FIM,
		dataFim: AGOSTO_INICIO,
		pesosPorDiaSemana: null,
		totalVendasHistorico: 0,
	});

	assert.equal(curva.dias.length, 0);
	const pacing = resolveGoalPacing({ curva, objetivos: OBJETIVOS, realizadoPorDia: emptyAchievement(), agora: AGOSTO_INICIO });
	assert.equal(pacing.metaDia, null);
	assert.equal(pacing.metaSemana, null);
	assert.equal(pacing.situacao, "NO_RITMO");
});

test("o esperado acumulado fecha em ontem, não em hoje", () => {
	const curva = linearCurve();
	// Dia 11 de agosto: dez dias fechados atrás.
	const agora = new Date(2026, 7, 11, 9, 30);
	const pacing = resolveGoalPacing({ curva, objetivos: OBJETIVOS, realizadoPorDia: emptyAchievement(), agora });

	assert.ok(Math.abs(pacing.esperadoAcumulado.valor - (100_000 * 10) / 31) < 1e-9);
});

test("primeiro dia da meta não tem esperado acumulado nem projeção", () => {
	const curva = linearCurve();
	const pacing = resolveGoalPacing({ curva, objetivos: OBJETIVOS, realizadoPorDia: emptyAchievement(), agora: AGOSTO_INICIO });

	assert.equal(pacing.esperadoAcumulado.valor, 0);
	assert.equal(pacing.projecao, null);
	// Sem dia fechado não há como estar atrasado.
	assert.equal(pacing.situacao, "NO_RITMO");
});

test("situação distingue adiantado, no ritmo e atrasado pela faixa morta", () => {
	const curva = linearCurve();
	const agora = new Date(2026, 7, 11);
	const esperado = (100_000 * 10) / 31;

	const situacaoPara = (realizado: number) => {
		const realizadoPorDia = indexDailyAchievement([{ dia: "2026-08-05", valor: realizado, qtdeVendas: 0, novosClientes: 0 }]);
		return resolveGoalPacing({ curva, objetivos: OBJETIVOS, realizadoPorDia, agora }).situacao;
	};

	assert.equal(situacaoPara(esperado), "NO_RITMO");
	assert.equal(situacaoPara(esperado * 1.02), "NO_RITMO");
	assert.equal(situacaoPara(esperado * 0.98), "NO_RITMO");
	assert.equal(situacaoPara(esperado * 1.2), "ADIANTADO");
	assert.equal(situacaoPara(esperado * 0.5), "ATRASADO");
});

test("realizado de hoje fica fora do acumulado mas aparece no dia", () => {
	const curva = linearCurve();
	const agora = new Date(2026, 7, 11, 14, 0);
	const realizadoPorDia = indexDailyAchievement([
		{ dia: "2026-08-10", valor: 4_000, qtdeVendas: 8, novosClientes: 1 },
		{ dia: "2026-08-11", valor: 1_500, qtdeVendas: 3, novosClientes: 0 },
	]);
	const pacing = resolveGoalPacing({ curva, objetivos: OBJETIVOS, realizadoPorDia, agora });

	assert.equal(pacing.realizadoAcumulado.valor, 4_000);
	assert.equal(pacing.realizadoDia.valor, 1_500);
	assert.equal(pacing.realizadoPeriodo.valor, 5_500);
});

test("a janela da semana é recortada pelo período da meta", () => {
	// 2026-08-01 é sábado: a semana corrente começou no domingo 26/07, fora da meta.
	const janela = resolveWeekWindow({ dataInicio: AGOSTO_INICIO, dataFim: AGOSTO_FIM, agora: AGOSTO_INICIO });

	assert.equal(janela.diasNoPeriodo, 1);
	assert.equal(janela.inicio.getDate(), 1);
	assert.equal(janela.fim.getDate(), 1);
});

test("a última semana é recortada no fim da meta", () => {
	// 2026-08-31 é segunda: a semana vai até sábado 05/09, além do fim da meta.
	const janela = resolveWeekWindow({ dataInicio: AGOSTO_INICIO, dataFim: AGOSTO_FIM, agora: AGOSTO_FIM });

	assert.equal(janela.diasNoPeriodo, 2);
	assert.equal(janela.fim.getDate(), 31);
});

test("meta da semana soma só os dias dentro do período", () => {
	const curva = linearCurve();
	const pacing = resolveGoalPacing({ curva, objetivos: OBJETIVOS, realizadoPorDia: emptyAchievement(), agora: AGOSTO_INICIO });

	// Um único dia da semana cai dentro da meta, então a meta da semana é a meta do dia.
	assert.ok(Math.abs((pacing.metaSemana?.valor ?? 0) - 100_000 / 31) < 1e-9);
});

test("ritmo necessário cresce quando o realizado fica para trás", () => {
	const curva = linearCurve();
	const agora = new Date(2026, 7, 11);
	const semNada = resolveGoalPacing({ curva, objetivos: OBJETIVOS, realizadoPorDia: emptyAchievement(), agora });
	const comMuito = resolveGoalPacing({
		curva,
		objetivos: OBJETIVOS,
		realizadoPorDia: indexDailyAchievement([{ dia: "2026-08-05", valor: 60_000, qtdeVendas: 0, novosClientes: 0 }]),
		agora,
	});

	assert.equal(semNada.diasRestantes, 21);
	assert.ok(Math.abs((semNada.ritmoNecessarioDiario ?? 0) - 100_000 / 21) < 1e-9);
	assert.ok((comMuito.ritmoNecessarioDiario ?? 0) < (semNada.ritmoNecessarioDiario ?? 0));
});

test("meta já batida zera o ritmo necessário em vez de devolver negativo", () => {
	const curva = linearCurve();
	const pacing = resolveGoalPacing({
		curva,
		objetivos: OBJETIVOS,
		realizadoPorDia: indexDailyAchievement([{ dia: "2026-08-05", valor: 150_000, qtdeVendas: 0, novosClientes: 0 }]),
		agora: new Date(2026, 7, 11),
	});

	assert.equal(pacing.ritmoNecessarioDiario, 0);
	assert.equal(pacing.situacao, "ADIANTADO");
});

test("objetivos opcionais ausentes não viram zero na meta do dia", () => {
	const curva = linearCurve();
	const pacing = resolveGoalPacing({
		curva,
		objetivos: { objetivoValor: 100_000, objetivoQtdeVendas: null, objetivoNovosClientes: null },
		realizadoPorDia: emptyAchievement(),
		agora: AGOSTO_INICIO,
	});

	assert.equal(pacing.metaDia?.qtdeVendas, null);
	assert.equal(pacing.metaDia?.novosClientes, null);
});

test("a série do gráfico para o realizado depois de hoje", () => {
	const curva = linearCurve();
	const agora = new Date(2026, 7, 3);
	const serie = buildGoalPacingSeries({
		curva,
		objetivos: OBJETIVOS,
		realizadoPorDia: indexDailyAchievement([{ dia: "2026-08-02", valor: 3_000, qtdeVendas: 0, novosClientes: 0 }]),
		agora,
	});

	assert.equal(serie[1]?.realizadoAcumulado, 3_000);
	assert.equal(serie[2]?.realizadoAcumulado, 3_000);
	// Dia 4 em diante é futuro: nulo, para a área não desabar visualmente.
	assert.equal(serie[3]?.realizadoAcumulado, null);
	assert.ok(Math.abs((serie.at(-1)?.objetivoAcumulado ?? 0) - 100_000) < 1e-9);
});

test("a fatia de uma janela arbitrária respeita a curva, não os dias corridos", () => {
	// Sábado vale o triplo. Uma janela de segunda a sexta deve receber menos que 5/31.
	const curva = buildGoalPacingCurve({
		dataInicio: AGOSTO_INICIO,
		dataFim: AGOSTO_FIM,
		pesosPorDiaSemana: [1, 1, 1, 1, 1, 1, 3],
		totalVendasHistorico: GOAL_PACING_FULL_HISTORY_SAMPLE,
	});

	const share = resolveGoalShareForWindow({ curva, janela: { inicio: new Date(2026, 7, 3), fim: new Date(2026, 7, 7) } });
	assert.ok(share < 5 / 31);
	assert.ok(share > 0);
});

test("janela fora do período não recebe fatia alguma", () => {
	const curva = linearCurve();
	const share = resolveGoalShareForWindow({ curva, janela: { inicio: new Date(2026, 8, 1), fim: new Date(2026, 8, 30) } });
	assert.equal(share, 0);
});

test("contagem de dias do período é inclusiva nas duas pontas", () => {
	assert.equal(countPeriodDays({ dataInicio: AGOSTO_INICIO, dataFim: AGOSTO_FIM }), 31);
	assert.equal(countPeriodDays({ dataInicio: AGOSTO_INICIO, dataFim: AGOSTO_INICIO }), 1);
	assert.equal(countPeriodDays({ dataInicio: AGOSTO_FIM, dataFim: AGOSTO_INICIO }), 0);
});
