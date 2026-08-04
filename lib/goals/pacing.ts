import dayjs from "dayjs";

/**
 * Decomposição de uma meta de período em metas por dia.
 *
 * O módulo inteiro existe para responder uma pergunta que o percentual do período não responde:
 * **62% no dia 20 é bom ou ruim?** Sem uma curva de distribuição não dá para saber, e o lojista
 * só descobre que ficou para trás no fim do mês, quando não há mais o que fazer.
 *
 * A primitiva é uma **curva de ritmo**: um peso por dia do período, somando 1. Meta do dia, meta
 * da semana, esperado até agora, ritmo necessário e projeção de fechamento são todos recortes
 * dessa mesma curva — não são cinco cálculos independentes.
 *
 * Duas estratégias de peso, misturadas por encolhimento e não por chave liga-desliga:
 * `HISTORICO` pondera cada dia pela participação daquele dia da semana no faturamento histórico
 * da organização; `LINEAR` dá 1/N para todos. Ver `resolveWeekdayWeightBlend` para o porquê da
 * mistura.
 */

/** Fatia da meta que a curva distribui. Espelha as três colunas de objetivo da tabela `goals`. */
export type TGoalObjectives = {
	objetivoValor: number;
	objetivoQtdeVendas?: number | null;
	objetivoNovosClientes?: number | null;
};

/** De onde vieram os pesos da curva. Vai no payload, então o valor é dado: português. */
export type TGoalPacingOrigin = "HISTORICO" | "LINEAR";

/** Situação do realizado contra o esperado até agora. */
export type TGoalPacingSituation = "ADIANTADO" | "NO_RITMO" | "ATRASADO";

export type TGoalPacingDay = {
	dia: Date;
	/** Fatia do objetivo que cabe neste dia. A soma de todos os dias é 1. */
	peso: number;
	/** Soma dos pesos até este dia, inclusive. Termina em 1. */
	pesoAcumulado: number;
};

export type TGoalPacingCurve = {
	dias: TGoalPacingDay[];
	origemDistribuicao: TGoalPacingOrigin;
};

/**
 * Amostra mínima para os pesos históricos valerem sozinhos.
 *
 * Abaixo disso a participação por dia da semana é ruído: uma organização com 40 vendas tem ~6
 * vendas por dia da semana, e uma única venda grande numa terça vira "terça vale o dobro".
 */
export const GOAL_PACING_FULL_HISTORY_SAMPLE = 200;

/** Faixa morta da situação: dentro de ±5% do esperado a meta está "no ritmo". */
export const GOAL_PACING_ON_TRACK_TOLERANCE = 0.05;

/** Acima deste peso histórico a curva se declara `HISTORICO`; abaixo, `LINEAR`. */
const HISTORY_ORIGIN_THRESHOLD = 0.5;

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * Dias corridos entre duas datas já normalizadas em `startOf("day")`, inclusivo nas duas pontas.
 *
 * O arredondamento em cima da diferença em milissegundos, em vez de `diff("day")`, existe porque
 * `diff` trunca: um par de datas separado por um dia de 23 horas (horário de verão) devolveria 0.
 */
function countInclusiveDays(start: dayjs.Dayjs, end: dayjs.Dayjs) {
	return Math.round(end.diff(start, "millisecond") / MILLISECONDS_IN_DAY) + 1;
}

/**
 * Mistura os pesos históricos por dia da semana com a distribuição uniforme.
 *
 * O encolhimento em direção ao uniforme não é conservadorismo gratuito: um corte seco entre
 * "usa histórico" e "usa linear" faria as metas diárias de uma organização **saltarem** no dia em
 * que ela cruzasse o limiar, sem nada ter mudado na operação. Com a mistura, `alpha = 0` colapsa
 * exatamente no linear e o caminho de código é um só.
 *
 * @param totalVendas tamanho da amostra histórica que gerou `pesosPorDiaSemana`
 * @param pesosPorDiaSemana participação de cada dia da semana (índice 0 = domingo), somando 1
 */
export function resolveWeekdayWeightBlend({
	pesosPorDiaSemana,
	totalVendas,
}: {
	pesosPorDiaSemana: number[] | null;
	totalVendas: number;
}) {
	const uniform = 1 / 7;
	if (!pesosPorDiaSemana || pesosPorDiaSemana.length !== 7 || totalVendas <= 0) {
		return { pesos: Array.from({ length: 7 }, () => uniform), alpha: 0 };
	}

	const somaPesos = pesosPorDiaSemana.reduce((acc, peso) => acc + peso, 0);
	// Uma amostra que não soma nada (só vendas de valor zero) não distingue dia nenhum.
	if (somaPesos <= 0) return { pesos: Array.from({ length: 7 }, () => uniform), alpha: 0 };

	const alpha = Math.min(1, totalVendas / GOAL_PACING_FULL_HISTORY_SAMPLE);
	const pesos = pesosPorDiaSemana.map((peso) => alpha * (peso / somaPesos) + (1 - alpha) * uniform);

	return { pesos, alpha };
}

/** Lista os dias do período, um por dia de calendário, com as pontas normalizadas. */
function listPeriodDays({ dataInicio, dataFim }: { dataInicio: Date; dataFim: Date }) {
	const start = dayjs(dataInicio).startOf("day");
	const end = dayjs(dataFim).startOf("day");
	if (end.isBefore(start)) return [];

	const totalDays = countInclusiveDays(start, end);
	return Array.from({ length: totalDays }, (_, index) => start.add(index, "day").toDate());
}

/**
 * Monta a curva de ritmo do período.
 *
 * Os pesos por dia da semana são renormalizados **sobre os dias que existem no período**, não
 * sobre a semana inteira: um mês com cinco sábados e quatro domingos distribui mais peso para
 * sábado do que a participação semanal sozinha indicaria, e é isso que se quer.
 */
export function buildGoalPacingCurve({
	dataInicio,
	dataFim,
	pesosPorDiaSemana,
	totalVendasHistorico,
}: {
	dataInicio: Date;
	dataFim: Date;
	pesosPorDiaSemana: number[] | null;
	totalVendasHistorico: number;
}): TGoalPacingCurve {
	const days = listPeriodDays({ dataInicio, dataFim });
	if (days.length === 0) return { dias: [], origemDistribuicao: "LINEAR" };

	const { pesos, alpha } = resolveWeekdayWeightBlend({ pesosPorDiaSemana, totalVendas: totalVendasHistorico });

	const rawWeights = days.map((day) => pesos[day.getDay()] ?? 0);
	const rawTotal = rawWeights.reduce((acc, weight) => acc + weight, 0);
	// Todos os dias do período caem em dias da semana de peso zero (loja que só abre em dias que
	// o período não cobre). Sem isto a normalização dividiria por zero e a meta sumiria.
	const normalizedWeights = rawTotal > 0 ? rawWeights.map((weight) => weight / rawTotal) : rawWeights.map(() => 1 / days.length);

	let running = 0;
	const dias = days.map((dia, index) => {
		running += normalizedWeights[index] ?? 0;
		return { dia, peso: normalizedWeights[index] ?? 0, pesoAcumulado: running };
	});

	return { dias, origemDistribuicao: alpha >= HISTORY_ORIGIN_THRESHOLD ? "HISTORICO" : "LINEAR" };
}

/** Objetivos multiplicados por uma fatia da curva. Mesmas chaves da meta, para casar no payload. */
function scaleObjectives({ objetivos, peso }: { objetivos: TGoalObjectives; peso: number }) {
	return {
		valor: objetivos.objetivoValor * peso,
		qtdeVendas: objetivos.objetivoQtdeVendas ? objetivos.objetivoQtdeVendas * peso : null,
		novosClientes: objetivos.objetivoNovosClientes ? objetivos.objetivoNovosClientes * peso : null,
	};
}

export type TGoalPacingScaledObjective = ReturnType<typeof scaleObjectives>;

/** Realizado de um dia do período. A chave é a data em `YYYY-MM-DD` no fuso da operação. */
export type TGoalDailyAchievement = {
	valor: number;
	qtdeVendas: number;
	novosClientes: number;
};

const EMPTY_ACHIEVEMENT: TGoalDailyAchievement = { valor: 0, qtdeVendas: 0, novosClientes: 0 };

function dayKey(date: Date) {
	return dayjs(date).format("YYYY-MM-DD");
}

/**
 * Recorte da semana corrente **dentro** do período da meta.
 *
 * A semana começa no domingo, como no calendário brasileiro e como no `EXTRACT(DOW)` do postgres
 * que alimenta os pesos — os dois índices precisam concordar.
 *
 * Metas são intervalos livres, então a semana quase nunca cabe inteira: uma meta que começa numa
 * quarta tem uma primeira semana de cinco dias. A janela devolvida é a interseção, e
 * `diasNoPeriodo` existe para a UI poder dizer isso em vez de mentir um alvo de sete dias.
 */
export function resolveWeekWindow({ dataInicio, dataFim, agora }: { dataInicio: Date; dataFim: Date; agora: Date }) {
	const periodStart = dayjs(dataInicio).startOf("day");
	const periodEnd = dayjs(dataFim).startOf("day");
	const weekStart = dayjs(agora).startOf("week");
	const weekEnd = weekStart.add(6, "day");

	const inicio = weekStart.isBefore(periodStart) ? periodStart : weekStart;
	const fim = weekEnd.isAfter(periodEnd) ? periodEnd : weekEnd;
	const diasNoPeriodo = fim.isBefore(inicio) ? 0 : countInclusiveDays(inicio, fim);

	return { inicio: inicio.toDate(), fim: fim.toDate(), diasNoPeriodo };
}

/**
 * Resolve o ritmo de uma meta contra o que já foi realizado.
 *
 * **O acumulado esperado vai até ontem, não até hoje.** Comparar o realizado parcial de hoje com
 * a meta cheia de hoje deixaria toda meta "atrasada" às 9h da manhã e "no ritmo" às 18h, todo dia.
 * Hoje aparece como barra própria; o veredito adiantado/atrasado olha para dias fechados.
 */
export function resolveGoalPacing({
	curva,
	objetivos,
	realizadoPorDia,
	agora,
}: {
	curva: TGoalPacingCurve;
	objetivos: TGoalObjectives;
	realizadoPorDia: Map<string, TGoalDailyAchievement>;
	agora: Date;
}) {
	const hojeKey = dayKey(agora);
	const dias = curva.dias;

	const diaAtual = dias.find((item) => dayKey(item.dia) === hojeKey) ?? null;
	const janelaSemana = dias.length > 0 ? resolveWeekWindow({ dataInicio: dias[0]!.dia, dataFim: dias[dias.length - 1]!.dia, agora }) : null;

	const pesoSemana = janelaSemana
		? dias
				.filter((item) => item.dia.getTime() >= janelaSemana.inicio.getTime() && item.dia.getTime() <= janelaSemana.fim.getTime())
				.reduce((acc, item) => acc + item.peso, 0)
		: 0;

	// Fecha em ontem: só dias inteiros entram no veredito.
	const pesoAcumuladoEsperado = dias.filter((item) => dayKey(item.dia) < hojeKey).reduce((acc, item) => acc + item.peso, 0);
	const pesoRestante = Math.max(0, 1 - pesoAcumuladoEsperado);

	const sumRealizado = (predicate: (day: TGoalPacingDay) => boolean) =>
		dias.filter(predicate).reduce(
			(acc, item) => {
				const realizado = realizadoPorDia.get(dayKey(item.dia)) ?? EMPTY_ACHIEVEMENT;
				return {
					valor: acc.valor + realizado.valor,
					qtdeVendas: acc.qtdeVendas + realizado.qtdeVendas,
					novosClientes: acc.novosClientes + realizado.novosClientes,
				};
			},
			{ ...EMPTY_ACHIEVEMENT },
		);

	const realizadoHoje = realizadoPorDia.get(hojeKey) ?? EMPTY_ACHIEVEMENT;
	const realizadoSemana = janelaSemana
		? sumRealizado((item) => item.dia.getTime() >= janelaSemana.inicio.getTime() && item.dia.getTime() <= janelaSemana.fim.getTime())
		: { ...EMPTY_ACHIEVEMENT };
	const realizadoAteOntem = sumRealizado((item) => dayKey(item.dia) < hojeKey);
	const realizadoPeriodo = sumRealizado(() => true);

	const esperadoAcumulado = scaleObjectives({ objetivos, peso: pesoAcumuladoEsperado });
	const diferenca = realizadoAteOntem.valor - esperadoAcumulado.valor;

	const situacao: TGoalPacingSituation =
		esperadoAcumulado.valor <= 0
			? "NO_RITMO"
			: Math.abs(diferenca) <= esperadoAcumulado.valor * GOAL_PACING_ON_TRACK_TOLERANCE
				? "NO_RITMO"
				: diferenca > 0
					? "ADIANTADO"
					: "ATRASADO";

	// Projeção só existe depois que algum dia fechou; antes disso não há taxa para extrapolar.
	const projecao = pesoAcumuladoEsperado > 0 ? realizadoAteOntem.valor / pesoAcumuladoEsperado : null;

	const faltaValor = Math.max(0, objetivos.objetivoValor - realizadoPeriodo.valor);
	const diasRestantes = dias.filter((item) => dayKey(item.dia) >= hojeKey).length;
	const ritmoNecessarioDiario = pesoRestante > 0 && diasRestantes > 0 ? faltaValor / diasRestantes : null;

	return {
		origemDistribuicao: curva.origemDistribuicao,
		metaDia: diaAtual ? scaleObjectives({ objetivos, peso: diaAtual.peso }) : null,
		metaSemana: janelaSemana ? scaleObjectives({ objetivos, peso: pesoSemana }) : null,
		realizadoDia: realizadoHoje,
		realizadoSemana,
		realizadoPeriodo,
		esperadoAcumulado,
		realizadoAcumulado: realizadoAteOntem,
		diferenca,
		situacao,
		projecao,
		ritmoNecessarioDiario,
		diasRestantes,
		janelaSemana,
	};
}

export type TGoalPacing = ReturnType<typeof resolveGoalPacing>;

/**
 * Série acumulada para o gráfico de curva: esperado como linha, realizado como área.
 *
 * O realizado para **depois de hoje**, em vez de cair para zero — uma área que despenca no dia
 * seguinte lê como colapso de vendas, não como "ainda não aconteceu".
 */
export function buildGoalPacingSeries({
	curva,
	objetivos,
	realizadoPorDia,
	agora,
}: {
	curva: TGoalPacingCurve;
	objetivos: TGoalObjectives;
	realizadoPorDia: Map<string, TGoalDailyAchievement>;
	agora: Date;
}) {
	const hojeKey = dayKey(agora);
	let realizadoAcumulado = 0;

	return curva.dias.map((item) => {
		const key = dayKey(item.dia);
		const isFuture = key > hojeKey;
		if (!isFuture) realizadoAcumulado += (realizadoPorDia.get(key) ?? EMPTY_ACHIEVEMENT).valor;

		return {
			dia: item.dia.toISOString(),
			rotulo: dayjs(item.dia).format("DD/MM"),
			objetivoAcumulado: objetivos.objetivoValor * item.pesoAcumulado,
			realizadoAcumulado: isFuture ? null : realizadoAcumulado,
		};
	});
}

export type TGoalPacingSeriesPoint = ReturnType<typeof buildGoalPacingSeries>[number];

/** Índice de realizado por dia a partir das linhas cruas do banco (chave `YYYY-MM-DD`). */
export function indexDailyAchievement(
	rows: { dia: string; valor: number; qtdeVendas: number; novosClientes: number }[],
): Map<string, TGoalDailyAchievement> {
	const index = new Map<string, TGoalDailyAchievement>();
	for (const row of rows) {
		const current = index.get(row.dia) ?? { ...EMPTY_ACHIEVEMENT };
		index.set(row.dia, {
			valor: current.valor + row.valor,
			qtdeVendas: current.qtdeVendas + row.qtdeVendas,
			novosClientes: current.novosClientes + row.novosClientes,
		});
	}
	return index;
}

/**
 * Proporção do objetivo aplicável a uma janela arbitrária que cruza o período da meta.
 *
 * É o que o gráfico de vendas precisa para desenhar a linha de meta de um filtro que não coincide
 * com o período da meta. Substitui a regra de três por dias corridos: uma janela de segunda a
 * sexta numa loja que fatura no fim de semana recebia meta demais.
 */
export function resolveGoalShareForWindow({ curva, janela }: { curva: TGoalPacingCurve; janela: { inicio: Date; fim: Date } }) {
	const inicioKey = dayKey(janela.inicio);
	const fimKey = dayKey(janela.fim);
	if (fimKey < inicioKey) return 0;

	return curva.dias.filter((item) => {
		const key = dayKey(item.dia);
		return key >= inicioKey && key <= fimKey;
	}).reduce((acc, item) => acc + item.peso, 0);
}

/** Dias corridos do período, inclusivo nas duas pontas. Usado pelos rótulos da UI. */
export function countPeriodDays({ dataInicio, dataFim }: { dataInicio: Date; dataFim: Date }) {
	const start = dayjs(dataInicio).startOf("day");
	const end = dayjs(dataFim).startOf("day");
	if (end.isBefore(start)) return 0;
	return countInclusiveDays(start, end);
}
