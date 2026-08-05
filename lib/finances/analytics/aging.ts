import dayjs from "dayjs";

export const AGING_BUCKETS = [
	{ chave: "vencido-60-plus", rotulo: "VENCIDO +60", minDays: Number.NEGATIVE_INFINITY, maxDays: -61 },
	{ chave: "vencido-31-60", rotulo: "VENCIDO 31-60", minDays: -60, maxDays: -31 },
	{ chave: "vencido-1-30", rotulo: "VENCIDO 1-30", minDays: -30, maxDays: -1 },
	{ chave: "a-vencer-0-30", rotulo: "A VENCER 0-30", minDays: 0, maxDays: 30 },
	{ chave: "a-vencer-31-60", rotulo: "A VENCER 31-60", minDays: 31, maxDays: 60 },
	{ chave: "a-vencer-60-plus", rotulo: "A VENCER +60", minDays: 61, maxDays: Number.POSITIVE_INFINITY },
] as const;

/** Janela retroativa usada para o atraso médio de recebimento/pagamento (proxy de DSO/DPO). */
export const DELAY_WINDOW_DAYS = 90;

type TPendingTransactionRow = {
	tipo: "ENTRADA" | "SAIDA";
	valor: number;
	dataPrevisao: Date | null;
};

/**
 * Distribui transações pendentes nos buckets de vencimento e acumula totais a receber/pagar.
 * Dias até o vencimento negativos = vencido. Pendências sem previsão caem no bucket "A VENCER 0-30".
 */
export function bucketPendingByDueDate(rows: TPendingTransactionRow[], referenceDate = new Date()) {
	const today = dayjs(referenceDate).startOf("day");
	const vencimentos = AGING_BUCKETS.map((bucket) => ({ chave: bucket.chave, rotulo: bucket.rotulo, receber: 0, pagar: 0 }));
	let totalAReceber = 0;
	let totalAPagar = 0;
	let vencidoAReceber = 0;
	let vencidoAPagar = 0;

	for (const row of rows) {
		const daysUntilDue = row.dataPrevisao ? dayjs(row.dataPrevisao).startOf("day").diff(today, "day") : 0;
		const bucketIndex = AGING_BUCKETS.findIndex((bucket) => daysUntilDue >= bucket.minDays && daysUntilDue <= bucket.maxDays);
		const bucket = vencimentos[bucketIndex];
		if (!bucket) continue;
		if (row.tipo === "ENTRADA") {
			bucket.receber += row.valor;
			totalAReceber += row.valor;
			if (daysUntilDue < 0) vencidoAReceber += row.valor;
		} else {
			bucket.pagar += row.valor;
			totalAPagar += row.valor;
			if (daysUntilDue < 0) vencidoAPagar += row.valor;
		}
	}

	return { vencimentos, totalAReceber, totalAPagar, vencidoAReceber, vencidoAPagar };
}
