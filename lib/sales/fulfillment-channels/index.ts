import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { applyIfoodFulfillmentTransition } from "./ifood";
import { getChannelErpPolicy, isManagedFulfillmentSaleModel, type TChannelErpPolicy } from "./policy";

export { getChannelErpPolicy, isManagedFulfillmentSaleModel };
export type { TChannelErpPolicy };

export type TFulfillmentChannel = "IFOOD";

type TSaleForChannelResolution = {
	modelo: string | null;
	processamentoOrigem: string | null;
};

/**
 * Resolve o canal de fulfillment gerenciado de uma venda, se houver. Vendas internas e vendas
 * de conectores sem gestão de pedido retornam null (fluxo local puro, comportamento atual).
 */
export function resolveFulfillmentChannelForSale(sale: TSaleForChannelResolution, policy: TChannelErpPolicy): TFulfillmentChannel | null {
	if (!policy.fulfillment) return null;
	if (sale.processamentoOrigem !== "EXTERNO") return null;
	if (!isManagedFulfillmentSaleModel(sale.modelo)) return null;
	return "IFOOD";
}

/**
 * Executa a ação externa correspondente à transição no canal do pedido, antes do estado local.
 * Retorna `appliedLocally: false` quando a transição NÃO deve ser aplicada localmente ainda
 * (ex.: cancelamento iFood, que aguarda o evento CANCELLED).
 */
export async function applyChannelFulfillmentTransition({
	channel,
	organizacaoId,
	orderId,
	fromStatus,
	toStatus,
	cancellationCode,
}: {
	channel: TFulfillmentChannel;
	organizacaoId: string;
	orderId: string;
	fromStatus: TSaleAttendanceStatusEnum;
	toStatus: TSaleAttendanceStatusEnum;
	cancellationCode?: string | null;
}): Promise<{ appliedLocally: boolean }> {
	if (channel === "IFOOD") {
		return applyIfoodFulfillmentTransition({ organizacaoId, orderId, fromStatus, toStatus, cancellationCode });
	}
	return { appliedLocally: true };
}
