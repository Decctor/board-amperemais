import type { TDeliveryModeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { saleItems, sales } from "@/services/drizzle/schema";
import { and, count, eq, inArray, sum } from "drizzle-orm";
import { computeAverage, computeShare } from "./classify";
import { buildSalesUniverseConditions, buildSalesUniverseIdsSubquery, type TSalesResultsFilters } from "./universe";

const NO_DELIVERY_MODE_KEY = "__sem_modalidade__";

/**
 * Resultado por modalidade de entrega (`sales.entregaModalidade`). Venda sem modalidade — importada
 * de fonte externa ou anterior ao ERP — entra numa linha própria, para que a soma das linhas feche
 * com o faturamento do resumo.
 */
export async function getSalesResultsByDeliveryMode({ filters, includeSensitive }: { filters: TSalesResultsFilters; includeSensitive: boolean }) {
	const [salesRows, itemsRows, cancelledRows] = await Promise.all([
		db
			.select({
				modalidade: sales.entregaModalidade,
				qtdeVendas: count(sales.id),
				faturamento: sum(sales.valorTotal),
				descontos: sum(sales.descontosTotal),
				custoTotal: sum(sales.custoTotal),
			})
			.from(sales)
			.where(and(...buildSalesUniverseConditions(filters, "CONFIRMADA")))
			.groupBy(sales.entregaModalidade),
		db
			.select({ modalidade: sales.entregaModalidade, qtdeItens: sum(saleItems.quantidade) })
			.from(saleItems)
			.innerJoin(sales, eq(saleItems.vendaId, sales.id))
			.where(inArray(saleItems.vendaId, buildSalesUniverseIdsSubquery(filters, "CONFIRMADA")))
			.groupBy(sales.entregaModalidade),
		db
			.select({ modalidade: sales.entregaModalidade, qtde: count(sales.id), valor: sum(sales.valorTotal) })
			.from(sales)
			.where(and(...buildSalesUniverseConditions(filters, "CANCELADA")))
			.groupBy(sales.entregaModalidade),
	]);

	const itemsMap = new Map(itemsRows.map((row) => [row.modalidade ?? NO_DELIVERY_MODE_KEY, Number(row.qtdeItens ?? 0)]));
	const cancelledMap = new Map(
		cancelledRows.map((row) => [row.modalidade ?? NO_DELIVERY_MODE_KEY, { qtde: row.qtde, valor: Number(row.valor ?? 0) }]),
	);
	const salesMap = new Map(salesRows.map((row) => [row.modalidade ?? NO_DELIVERY_MODE_KEY, row]));

	// Modalidade que só teve cancelamento no período ainda aparece, com zero vendido.
	const keys = new Set<string>([...salesMap.keys(), ...cancelledMap.keys()]);
	const faturamentoTotal = salesRows.reduce((acc, row) => acc + Number(row.faturamento ?? 0), 0);

	const linhas = Array.from(keys)
		.map((key) => {
			const row = salesMap.get(key);
			const faturamento = Number(row?.faturamento ?? 0);
			const custoTotal = Number(row?.custoTotal ?? 0);
			const qtdeVendas = row?.qtdeVendas ?? 0;
			return {
				modalidade: key === NO_DELIVERY_MODE_KEY ? null : (key as TDeliveryModeEnum),
				qtdeVendas,
				faturamento,
				descontos: Number(row?.descontos ?? 0),
				ticketMedio: computeAverage(faturamento, qtdeVendas),
				qtdeItens: itemsMap.get(key) ?? 0,
				custoTotal: includeSensitive ? custoTotal : null,
				margemBruta: includeSensitive ? faturamento - custoTotal : null,
				canceladas: cancelledMap.get(key) ?? { qtde: 0, valor: 0 },
				participacaoPercentual: computeShare(faturamento, faturamentoTotal),
			};
		})
		.sort((a, b) => b.faturamento - a.faturamento);

	return { linhas, faturamentoTotal };
}
export type TSalesResultsByDeliveryMode = Awaited<ReturnType<typeof getSalesResultsByDeliveryMode>>;
