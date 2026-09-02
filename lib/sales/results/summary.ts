import { getPreviousPeriod } from "@/lib/finances/analytics/periods";
import { getOverallSaleGoal } from "@/lib/sales/overall-stats";
import { db } from "@/services/drizzle";
import { saleItems, sales } from "@/services/drizzle/schema";
import { and, count, inArray, sum } from "drizzle-orm";
import { computeAverage, computeGoalAttainment } from "./classify";
import { buildSalesUniverseConditions, buildSalesUniverseIdsSubquery, type TSalesResultsFilters } from "./universe";

type TWindowTotals = {
	qtdeVendas: number;
	faturamento: number;
	descontos: number;
	acrescimos: number;
	custoTotal: number;
	qtdeItens: number;
};

async function getWindowTotals(filters: TSalesResultsFilters): Promise<TWindowTotals> {
	const [[salesRow], [itemsRow]] = await Promise.all([
		db
			.select({
				qtdeVendas: count(sales.id),
				faturamento: sum(sales.valorTotal),
				descontos: sum(sales.descontosTotal),
				acrescimos: sum(sales.acrescimosTotal),
				custoTotal: sum(sales.custoTotal),
			})
			.from(sales)
			.where(and(...buildSalesUniverseConditions(filters, "CONFIRMADA"))),
		db
			.select({ qtdeItens: sum(saleItems.quantidade) })
			.from(saleItems)
			.where(and(inArray(saleItems.vendaId, buildSalesUniverseIdsSubquery(filters, "CONFIRMADA")))),
	]);

	return {
		qtdeVendas: salesRow.qtdeVendas,
		faturamento: Number(salesRow.faturamento ?? 0),
		descontos: Number(salesRow.descontos ?? 0),
		acrescimos: Number(salesRow.acrescimos ?? 0),
		custoTotal: Number(salesRow.custoTotal ?? 0),
		qtdeItens: Number(itemsRow.qtdeItens ?? 0),
	};
}

async function getCancelledTotals(filters: TSalesResultsFilters) {
	const [row] = await db
		.select({ qtde: count(sales.id), valor: sum(sales.valorTotal) })
		.from(sales)
		.where(and(...buildSalesUniverseConditions(filters, "CANCELADA")));
	return { qtde: row.qtde, valor: Number(row.valor ?? 0) };
}

function describe(atual: number | null, anterior: number | null) {
	return { atual, anterior };
}

/**
 * Resumo do período com o período imediatamente anterior de mesma duração (mesma convenção de
 * `getOverallStats`). Custo e margem só saem quando o membro pode ver dados sensíveis.
 */
export async function getSalesResultsSummary({ filters, includeSensitive }: { filters: TSalesResultsFilters; includeSensitive: boolean }) {
	const previous = getPreviousPeriod({ after: filters.after, before: filters.before });
	const previousFilters: TSalesResultsFilters = { ...filters, after: previous.after, before: previous.before };

	const [current, prior, canceladas, meta] = await Promise.all([
		getWindowTotals(filters),
		getWindowTotals(previousFilters),
		getCancelledTotals(filters),
		getOverallSaleGoal({ after: filters.after.toISOString(), before: filters.before.toISOString(), organizacaoId: filters.organizacaoId }),
	]);

	const margem = (totals: TWindowTotals) => totals.faturamento - totals.custoTotal;

	return {
		periodo: { inicio: filters.after, fim: filters.before, anteriorInicio: previous.after, anteriorFim: previous.before },
		qtdeVendas: describe(current.qtdeVendas, prior.qtdeVendas),
		faturamento: describe(current.faturamento, prior.faturamento),
		descontos: describe(current.descontos, prior.descontos),
		acrescimos: describe(current.acrescimos, prior.acrescimos),
		ticketMedio: describe(computeAverage(current.faturamento, current.qtdeVendas), computeAverage(prior.faturamento, prior.qtdeVendas)),
		qtdeItens: describe(current.qtdeItens, prior.qtdeItens),
		custoTotal: includeSensitive ? describe(current.custoTotal, prior.custoTotal) : null,
		margemBruta: includeSensitive ? describe(margem(current), margem(prior)) : null,
		canceladas,
		meta: meta > 0 ? { objetivo: meta, atingidoPercentual: computeGoalAttainment(current.faturamento, meta) } : null,
	};
}
export type TSalesResultsSummary = Awaited<ReturnType<typeof getSalesResultsSummary>>;
