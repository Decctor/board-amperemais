import { sales } from "@/services/drizzle/schema";
import { and, eq, gt, type SQL } from "drizzle-orm";

/**
 * Condições de "venda válida" para métricas de cliente/receita: venda confirmada e valor
 * positivo. A natureza pertence ao dado de origem (ex.: SN01 ou NFCE), não ao ciclo comercial.
 * (recalcular metadata do cliente) e as rotas de estatísticas (LTV, lifetime, faturamentos).
 */
export function getValidSaleConditions({ orgId }: { orgId: string }): SQL[] {
	return [
		eq(sales.organizacaoId, orgId),
		gt(sales.valorTotal, 0),
		eq(sales.statusVenda, "CONFIRMADA"),
	];
}

export function getValidClientSaleWhere({ orgId, clientId }: { orgId: string; clientId: string }) {
	return and(...getValidSaleConditions({ orgId }), eq(sales.clienteId, clientId));
}
