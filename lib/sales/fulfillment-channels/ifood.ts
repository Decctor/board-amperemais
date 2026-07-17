import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { confirmIfoodOrder, dispatchIfoodOrder, requestIfoodOrderCancellation, setIfoodOrderReadyToPickup } from "@/lib/integrations/ifood/orders";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import createHttpError from "http-errors";

/**
 * Adapter de fulfillment do canal iFood: traduz uma transição do quadro de atendimento em
 * chamadas à Order API ANTES de o estado local mudar. Se o iFood rejeitar, o erro sobe e nada
 * muda localmente.
 *
 * Mapeamento (docs/dev-planning/ifood-orders-fulfillment-plan.md):
 * - sair de NAO_INICIADO           → confirm (SLA de 8 minutos)
 * - → PRONTO                       → readyToPickup
 * - → EM_ENTREGA                   → dispatch (entrega própria)
 * - → ENTREGUE                     → sem chamada (a conclusão vem do evento CONCLUDED)
 * - → CANCELADO                    → requestCancellation — e o estado local NÃO muda aqui:
 *                                    o cancelamento só se concretiza quando o evento CANCELLED
 *                                    chega pela ingestão (o pedido de cancelamento pode ser negado).
 */
export async function applyIfoodFulfillmentTransition({
	organizacaoId,
	orderId,
	fromStatus,
	toStatus,
	cancellationCode,
}: {
	organizacaoId: string;
	orderId: string;
	fromStatus: TSaleAttendanceStatusEnum;
	toStatus: TSaleAttendanceStatusEnum;
	cancellationCode?: string | null;
}): Promise<{ appliedLocally: boolean }> {
	const context = await resolveIfoodManagementContext({ organizacaoId });

	if (toStatus === "CANCELADO") {
		if (!cancellationCode) throw new createHttpError.BadRequest("Informe o motivo de cancelamento do pedido no iFood.");
		await requestIfoodOrderCancellation(context.client, orderId, cancellationCode);
		// O cancelamento é assíncrono no iFood — o card só sai do quadro com o evento CANCELLED.
		return { appliedLocally: false };
	}

	// Pedido ainda não confirmado: qualquer avanço passa primeiro pela confirmação.
	if (fromStatus === "NAO_INICIADO") {
		await confirmIfoodOrder(context.client, orderId);
	}

	if (toStatus === "PRONTO") await setIfoodOrderReadyToPickup(context.client, orderId);
	if (toStatus === "EM_ENTREGA") await dispatchIfoodOrder(context.client, orderId);
	// EM_PREPARO após confirm e ENTREGUE/PARCIALMENTE_ENTREGUE não têm chamada própria.

	return { appliedLocally: true };
}
