import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { percentile } from "@/utils/analytics";
import dayjs from "dayjs";
import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { type TAnalysisSufficiency, buildSufficiency } from "./types";

export type TRepurchaseCycleAnalysis = {
	periodoMeses: number;
	clientesComRecompra: number;
	intervalosObservados: number;
	intervaloDiasMediana: number | null;
	intervaloDiasP25: number | null;
	intervaloDiasP75: number | null;
	intervaloDiasP90: number | null;
	// Recência a partir da qual um cliente foge do ciclo natural (sugestão de
	// limiar de inatividade/churn, baseado no P75/P90 da própria base).
	limiteInatividadeSugeridoDias: number | null;
	alertas: string[];
	suficiencia: TAnalysisSufficiency;
};

/**
 * Distribuição do intervalo entre compras consecutivas (em dias) dos clientes
 * identificados. Usa mediana e percentis — nunca a média — porque a distribuição
 * de recompra no varejo é assimétrica e de cauda longa. O P75/P90 serve de base
 * para definir "quando o cliente fugiu do ciclo" de forma data-driven, em vez de
 * um limiar arbitrário de N dias. Clientes com uma única compra no período não
 * geram intervalo e ficam de fora deste cálculo (mas são contados à parte).
 */
export async function getRepurchaseCycle({
	organizacaoId,
	months = 12,
}: {
	organizacaoId: string;
	months?: number;
}): Promise<TRepurchaseCycleAnalysis> {
	const intervalStart = dayjs().subtract(months, "month").startOf("day").toDate();
	const intervalEnd = dayjs().endOf("day").toDate();

	const rows = await db
		.select({
			clienteId: sales.clienteId,
			dataVenda: sales.dataVenda,
		})
		.from(sales)
		.where(
			and(
				eq(sales.organizacaoId, organizacaoId),
				eq(sales.natureza, "SN01"),
				isNotNull(sales.clienteId),
				isNotNull(sales.dataVenda),
				gte(sales.dataVenda, intervalStart),
				lte(sales.dataVenda, intervalEnd),
			),
		)
		.orderBy(asc(sales.clienteId), asc(sales.dataVenda));

	const gapsDias: number[] = [];
	const clientesComRecompra = new Set<string>();
	let previousClientId: string | null = null;
	let previousDate: Date | null = null;

	for (const row of rows) {
		if (!row.clienteId || !row.dataVenda) continue;
		const currentDate = new Date(row.dataVenda);

		if (row.clienteId === previousClientId && previousDate) {
			const gap = dayjs(currentDate).diff(dayjs(previousDate), "day");
			// Ignora compras no mesmo dia (geralmente a mesma visita fracionada).
			if (gap > 0) {
				gapsDias.push(gap);
				clientesComRecompra.add(row.clienteId);
			}
		}

		previousClientId = row.clienteId;
		previousDate = currentDate;
	}

	const mediana = percentile(gapsDias, 50);
	const p25 = percentile(gapsDias, 25);
	const p75 = percentile(gapsDias, 75);
	const p90 = percentile(gapsDias, 90);

	const alertas: string[] = [];
	if (gapsDias.length === 0) {
		alertas.push(
			"Nenhum intervalo de recompra observado no período: a base é predominantemente de compra única ou de cliente não identificado. Reativação por recência ainda funciona, mas o ciclo natural não pode ser estimado.",
		);
	}

	return {
		periodoMeses: months,
		clientesComRecompra: clientesComRecompra.size,
		intervalosObservados: gapsDias.length,
		intervaloDiasMediana: mediana !== null ? Math.round(mediana) : null,
		intervaloDiasP25: p25 !== null ? Math.round(p25) : null,
		intervaloDiasP75: p75 !== null ? Math.round(p75) : null,
		intervaloDiasP90: p90 !== null ? Math.round(p90) : null,
		limiteInatividadeSugeridoDias: p90 !== null ? Math.round(p90) : null,
		alertas,
		suficiencia: buildSufficiency(gapsDias.length),
	};
}
