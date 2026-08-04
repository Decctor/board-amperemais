import dayjs from "dayjs";

/**
 * Períodos pré-definidos de meta.
 *
 * A tabela `goals` guarda um intervalo livre, mas na prática o lojista pensa em mês fechado. O
 * formulário parte daí: o preset é o controle, as datas são a confirmação. Só quem realmente quer
 * um intervalo torto abre os campos de data.
 */

/** Valor do preset. Vai para o estado do formulário, não para o banco. */
export type TGoalPeriodPresetId = "MES_ATUAL" | "MES_PROXIMO" | "TRIMESTRE_ATUAL" | "PERSONALIZADO";

export type TGoalPeriodRange = { dataInicio: Date; dataFim: Date };

/** As metas cobrem o dia inteiro nas duas pontas: início às 00:00, fim às 23:59:59.999. */
function toGoalRange(start: dayjs.Dayjs, end: dayjs.Dayjs): TGoalPeriodRange {
	return { dataInicio: start.startOf("day").toDate(), dataFim: end.endOf("day").toDate() };
}

export const GOAL_PERIOD_PRESETS: { id: Exclude<TGoalPeriodPresetId, "PERSONALIZADO">; label: string; resolve: (referencia: Date) => TGoalPeriodRange }[] = [
	{
		id: "MES_ATUAL",
		label: "Este mês",
		resolve: (referencia) => toGoalRange(dayjs(referencia).startOf("month"), dayjs(referencia).endOf("month")),
	},
	{
		id: "MES_PROXIMO",
		label: "Próximo mês",
		resolve: (referencia) => toGoalRange(dayjs(referencia).add(1, "month").startOf("month"), dayjs(referencia).add(1, "month").endOf("month")),
	},
	{
		id: "TRIMESTRE_ATUAL",
		label: "Trimestre",
		resolve: (referencia) => {
			const quarterStartMonth = Math.floor(dayjs(referencia).month() / 3) * 3;
			const start = dayjs(referencia).month(quarterStartMonth).startOf("month");
			return toGoalRange(start, start.add(2, "month").endOf("month"));
		},
	},
];

/** O período com que uma meta nova nasce. Mês corrente — é o que o lojista quer em quase todo caso. */
export function resolveDefaultGoalPeriod(referencia: Date = new Date()): TGoalPeriodRange {
	return GOAL_PERIOD_PRESETS[0]!.resolve(referencia);
}

/**
 * Descobre qual preset corresponde a um intervalo já salvo.
 *
 * Existe para o modal de edição abrir com o preset certo selecionado em vez de cair sempre em
 * "Personalizado" — abrir uma meta mensal em modo personalizado ensina que o preset não é confiável.
 */
export function matchGoalPeriodPreset({ dataInicio, dataFim }: TGoalPeriodRange, referencia: Date = new Date()): TGoalPeriodPresetId {
	for (const preset of GOAL_PERIOD_PRESETS) {
		const range = preset.resolve(referencia);
		if (dayjs(range.dataInicio).isSame(dataInicio, "day") && dayjs(range.dataFim).isSame(dataFim, "day")) return preset.id;
	}
	return "PERSONALIZADO";
}

/** Rótulo do intervalo para a linha de confirmação embaixo dos presets. */
export function formatGoalPeriodSummary({ dataInicio, dataFim }: TGoalPeriodRange, totalDias: number) {
	const inicio = dayjs(dataInicio).format("DD/MM/YYYY");
	const fim = dayjs(dataFim).format("DD/MM/YYYY");
	return `${inicio} → ${fim} · ${totalDias} ${totalDias === 1 ? "dia" : "dias"}`;
}

/**
 * Metas que se sobrepõem ao intervalo escolhido.
 *
 * O modelo permite sobreposição e nada impede duas metas ativas ao mesmo tempo — mas o dashboard
 * resolve a meta ativa com um `find`, então a segunda simplesmente some da tela. O formulário avisa
 * em vez de bloquear: quem quiser sobrepor pode, sabendo o que acontece.
 */
export function findOverlappingGoals<T extends { id: string; dataInicio: Date | string; dataFim: Date | string }>({
	goals,
	range,
	ignoreGoalId,
}: {
	goals: T[];
	range: TGoalPeriodRange;
	ignoreGoalId?: string | null;
}) {
	return goals.filter((goal) => {
		if (ignoreGoalId && goal.id === ignoreGoalId) return false;
		const inicio = dayjs(goal.dataInicio);
		const fim = dayjs(goal.dataFim);
		return !fim.isBefore(range.dataInicio, "day") && !inicio.isAfter(range.dataFim, "day");
	});
}
