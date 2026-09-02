import { getSellerSaleGoal } from "@/lib/reports/data-fetchers";
import { db } from "@/services/drizzle";
import { saleItems, sales, sellers } from "@/services/drizzle/schema";
import { and, count, eq, inArray, sum } from "drizzle-orm";
import { computeAverage, computeGoalAttainment } from "./classify";
import { buildSalesUniverseConditions, buildSalesUniverseIdsSubquery, type TSalesResultsFilters } from "./universe";

const NO_SELLER_KEY = "__sem_vendedor__";

/**
 * Resultado por vendedor, agrupado por `sales.vendedorId` (nunca pelo nome denormalizado).
 * Vendas sem vendedor entram numa linha própria para que a soma das linhas feche com o resumo.
 */
export async function getSalesResultsBySeller({ filters, includeSensitive }: { filters: TSalesResultsFilters; includeSensitive: boolean }) {
	const [salesRows, itemsRows, cancelledRows] = await Promise.all([
		db
			.select({
				vendedorId: sales.vendedorId,
				qtdeVendas: count(sales.id),
				faturamento: sum(sales.valorTotal),
				descontos: sum(sales.descontosTotal),
				custoTotal: sum(sales.custoTotal),
			})
			.from(sales)
			.where(and(...buildSalesUniverseConditions(filters, "CONFIRMADA")))
			.groupBy(sales.vendedorId),
		db
			.select({ vendedorId: sales.vendedorId, qtdeItens: sum(saleItems.quantidade) })
			.from(saleItems)
			.innerJoin(sales, eq(saleItems.vendaId, sales.id))
			.where(inArray(saleItems.vendaId, buildSalesUniverseIdsSubquery(filters, "CONFIRMADA")))
			.groupBy(sales.vendedorId),
		db
			.select({ vendedorId: sales.vendedorId, qtde: count(sales.id), valor: sum(sales.valorTotal) })
			.from(sales)
			.where(and(...buildSalesUniverseConditions(filters, "CANCELADA")))
			.groupBy(sales.vendedorId),
	]);

	const sellerIds = Array.from(
		new Set([...salesRows, ...cancelledRows].map((row) => row.vendedorId).filter((id): id is string => Boolean(id))),
	);

	const [sellersRows, goals] = await Promise.all([
		sellerIds.length > 0
			? db.query.sellers.findMany({
					where: and(eq(sellers.organizacaoId, filters.organizacaoId), inArray(sellers.id, sellerIds)),
					columns: { id: true, nome: true, avatarUrl: true },
				})
			: Promise.resolve([]),
		Promise.all(
			sellerIds.map(async (sellerId) => [
				sellerId,
				await getSellerSaleGoal({ sellerId, after: filters.after, before: filters.before, organizacaoId: filters.organizacaoId }),
			]),
		),
	]);
	const sellersMap = new Map(sellersRows.map((seller) => [seller.id, seller]));
	const goalsMap = new Map(goals as [string, number][]);
	const itemsMap = new Map(itemsRows.map((row) => [row.vendedorId ?? NO_SELLER_KEY, Number(row.qtdeItens ?? 0)]));
	const cancelledMap = new Map(cancelledRows.map((row) => [row.vendedorId ?? NO_SELLER_KEY, { qtde: row.qtde, valor: Number(row.valor ?? 0) }]));

	// Vendedores que só têm cancelamentos no período ainda aparecem, com zero vendido.
	const keys = new Set<string>([...salesRows.map((row) => row.vendedorId ?? NO_SELLER_KEY), ...cancelledMap.keys()]);
	const salesMap = new Map(salesRows.map((row) => [row.vendedorId ?? NO_SELLER_KEY, row]));

	return Array.from(keys)
		.map((key) => {
			const row = salesMap.get(key);
			const vendedorId = key === NO_SELLER_KEY ? null : key;
			const seller = vendedorId ? sellersMap.get(vendedorId) : undefined;
			const faturamento = Number(row?.faturamento ?? 0);
			const custoTotal = Number(row?.custoTotal ?? 0);
			const qtdeVendas = row?.qtdeVendas ?? 0;
			const meta = vendedorId ? (goalsMap.get(vendedorId) ?? 0) : 0;
			return {
				vendedorId,
				vendedorNome: seller?.nome ?? (vendedorId ? "Vendedor removido" : "Sem vendedor"),
				vendedorAvatarUrl: seller?.avatarUrl ?? null,
				qtdeVendas,
				faturamento,
				descontos: Number(row?.descontos ?? 0),
				ticketMedio: computeAverage(faturamento, qtdeVendas),
				qtdeItens: itemsMap.get(key) ?? 0,
				custoTotal: includeSensitive ? custoTotal : null,
				margemBruta: includeSensitive ? faturamento - custoTotal : null,
				canceladas: cancelledMap.get(key) ?? { qtde: 0, valor: 0 },
				meta: meta > 0 ? { objetivo: meta, atingidoPercentual: computeGoalAttainment(faturamento, meta) } : null,
			};
		})
		.sort((a, b) => b.faturamento - a.faturamento);
}
export type TSalesResultsBySeller = Awaited<ReturnType<typeof getSalesResultsBySeller>>;
