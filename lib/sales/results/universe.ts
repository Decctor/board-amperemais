import { sales } from "@/services/drizzle/schema";
import { and, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { db } from "@/services/drizzle";

export type TSalesResultsFilters = {
	organizacaoId: string;
	after: Date;
	before: Date;
	sellersIds: string[];
	channels: string[];
};

/**
 * Universo de vendas do relatório: vendas da organização com `dataVenda` na janela, no status
 * pedido, recortadas pelos filtros de vendedor (por `vendedorId`) e canal (`sales.canal`).
 * Toda seção do relatório parte daqui para que os números batam entre si.
 */
export function buildSalesUniverseConditions(filters: TSalesResultsFilters, status: "CONFIRMADA" | "CANCELADA"): SQL[] {
	const conditions: SQL[] = [
		eq(sales.organizacaoId, filters.organizacaoId),
		eq(sales.statusVenda, status),
		gte(sales.dataVenda, filters.after),
		lte(sales.dataVenda, filters.before),
	];
	if (filters.sellersIds.length > 0) conditions.push(inArray(sales.vendedorId, filters.sellersIds));
	if (filters.channels.length > 0) conditions.push(inArray(sales.canal, filters.channels));
	return conditions;
}

/** Subquery com os ids do universo, para `inArray(x.vendaId, ...)` nas seções que partem de outras tabelas. */
export function buildSalesUniverseIdsSubquery(filters: TSalesResultsFilters, status: "CONFIRMADA" | "CANCELADA") {
	return db
		.select({ id: sales.id })
		.from(sales)
		.where(and(...buildSalesUniverseConditions(filters, status)));
}
