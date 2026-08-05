import dayjs from "dayjs";

/** Janela fixa de meses fechados usada para o burn médio; meses sem movimento contam como zero. */
export const BURN_WINDOW_MONTHS = 3;

type TMonthlyFlow = { mes: string; entradas: number; saidas: number; liquido: number };

/**
 * Burn = média do fluxo líquido efetivado dos últimos meses fechados. Runway em meses de caixa
 * (null quando não há queima ou não há caixa).
 */
export function computeBurnAndRunway({ fluxosMensais, totalCaixa }: { fluxosMensais: TMonthlyFlow[]; totalCaixa: number }) {
	const totalNet = fluxosMensais.reduce((acc, current) => acc + current.liquido, 0);
	const mediaLiquidaMensal = totalNet / BURN_WINDOW_MONTHS;
	const queimaMensal = mediaLiquidaMensal < 0 ? -mediaLiquidaMensal : 0;
	const mesesDeCaixa = queimaMensal > 0 && totalCaixa > 0 ? totalCaixa / queimaMensal : null;
	return { mediaLiquidaMensal, queimaMensal, mesesDeCaixa };
}

export type TProjectedCashFlow = {
	tipo: "ENTRADA" | "SAIDA";
	valor: number;
	dataPrevisao: Date;
};

/**
 * Projeção diária de caixa de hoje até o horizonte: previsões vencidas são alocadas em "hoje",
 * saldo corre acumulando entradas − saídas e a primeira data com saldo negativo é destacada.
 */
export function buildDailyCashProjection({
	horizonDays,
	saldoInicial,
	flows,
	referenceDate = new Date(),
}: {
	horizonDays: number;
	saldoInicial: number;
	flows: TProjectedCashFlow[];
	referenceDate?: Date;
}) {
	const today = dayjs(referenceDate).startOf("day");
	const dailyBuckets = new Map<string, { entradas: number; saidas: number }>();
	for (let dayOffset = 0; dayOffset <= horizonDays; dayOffset++) {
		dailyBuckets.set(today.add(dayOffset, "day").format("YYYY-MM-DD"), { entradas: 0, saidas: 0 });
	}

	for (const flow of flows) {
		const flowDate = dayjs(flow.dataPrevisao).isBefore(today) ? today : dayjs(flow.dataPrevisao).startOf("day");
		const bucket = dailyBuckets.get(flowDate.format("YYYY-MM-DD"));
		if (!bucket) continue;
		if (flow.tipo === "ENTRADA") bucket.entradas += flow.valor;
		else bucket.saidas += flow.valor;
	}

	let runningBalance = saldoInicial;
	let primeiraDataNegativa: string | null = null;
	let totalEntradasPrevistas = 0;
	let totalSaidasPrevistas = 0;
	const diaria = [...dailyBuckets.entries()].map(([data, bucket]) => {
		runningBalance += bucket.entradas - bucket.saidas;
		totalEntradasPrevistas += bucket.entradas;
		totalSaidasPrevistas += bucket.saidas;
		if (runningBalance < 0 && !primeiraDataNegativa) primeiraDataNegativa = data;
		return {
			data,
			entradas: bucket.entradas,
			saidas: bucket.saidas,
			saldoProjetado: runningBalance,
		};
	});

	return {
		saldoInicial,
		saldoFinal: runningBalance,
		totalEntradasPrevistas,
		totalSaidasPrevistas,
		primeiraDataNegativa: primeiraDataNegativa as string | null,
		diaria,
	};
}
