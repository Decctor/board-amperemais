import { sales } from "@/services/drizzle/schema";
import { and, eq, gt, isNull, ne, or, type SQL } from "drizzle-orm";

/**
 * Condições de "venda válida" para métricas de cliente/receita: receita de venda (SN01),
 * valor positivo e não cancelada. Definição única compartilhada entre as rotas de vendas
 * (recalcular metadata do cliente) e as rotas de estatísticas (LTV, lifetime, faturamentos).
 */
export function getValidSaleConditions({ orgId }: { orgId: string }): SQL[] {
	return [
		eq(sales.organizacaoId, orgId),
		eq(sales.natureza, "SN01"),
		gt(sales.valorTotal, 0),
		or(isNull(sales.statusVenda), ne(sales.statusVenda, "CANCELADA")) as SQL,
	];
}

export function getValidClientSaleWhere({ orgId, clientId }: { orgId: string; clientId: string }) {
	return and(...getValidSaleConditions({ orgId }), eq(sales.clienteId, clientId));
}
