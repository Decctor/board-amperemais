import { IFOOD_ORDER_BASE_URL, IfoodOrderSchema } from "@/lib/data-connectors/ifood/types";
import type { AxiosInstance } from "axios";
import { mapIfoodError } from "./errors";
import {
	IfoodCancellationReasonsResponseSchema,
	mapIfoodCancellationReasons,
	mapIfoodOrderDetails,
	type TIfoodCancellationReasonDTO,
	type TIfoodOrderDetailsDTO,
} from "./order-types";

/**
 * Funções de GESTÃO da Order API v1.0. Todas recebem o axios client autenticado
 * (de `createIfoodClient`) e retornam DTOs mapeados — nunca o payload cru do iFood.
 *
 * Ciclo de vida: confirm (SLA de 8 minutos) → startPreparation → readyToPickup (obrigatório em
 * TAKEOUT/DINE_IN) → dispatch (apenas entrega própria) → conclusão via evento CONCLUDED.
 * As ações respondem 202 e o resultado efetivo chega como evento (polling/webhook).
 */

export async function getIfoodOrderDetails(client: AxiosInstance, orderId: string): Promise<TIfoodOrderDetailsDTO> {
	try {
		const response = await client.get<unknown>(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}`);
		return mapIfoodOrderDetails(IfoodOrderSchema.parse(response.data));
	} catch (error) {
		mapIfoodError("getIfoodOrderDetails", error);
	}
}

export async function getIfoodOrderCancellationReasons(client: AxiosInstance, orderId: string): Promise<TIfoodCancellationReasonDTO[]> {
	try {
		const response = await client.get<unknown>(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/cancellationReasons`);
		return mapIfoodCancellationReasons(IfoodCancellationReasonsResponseSchema.parse(response.data));
	} catch (error) {
		mapIfoodError("getIfoodOrderCancellationReasons", error);
	}
}

export async function confirmIfoodOrder(client: AxiosInstance, orderId: string): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/confirm`);
	} catch (error) {
		mapIfoodError("confirmIfoodOrder", error);
	}
}

export async function startIfoodOrderPreparation(client: AxiosInstance, orderId: string): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/startPreparation`);
	} catch (error) {
		mapIfoodError("startIfoodOrderPreparation", error);
	}
}

export async function setIfoodOrderReadyToPickup(client: AxiosInstance, orderId: string): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/readyToPickup`);
	} catch (error) {
		mapIfoodError("setIfoodOrderReadyToPickup", error);
	}
}

export async function dispatchIfoodOrder(client: AxiosInstance, orderId: string): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/dispatch`, { deliveredBy: "MERCHANT" });
	} catch (error) {
		mapIfoodError("dispatchIfoodOrder", error);
	}
}

export async function requestIfoodOrderCancellation(client: AxiosInstance, orderId: string, cancellationCode: string): Promise<void> {
	try {
		// A doc atual documenta `{ reason: "<código>" }`; a variante anterior da Order API usava
		// `cancellationCode`. Enviamos ambos com o código — campos desconhecidos são ignorados.
		await client.post(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/requestCancellation`, {
			reason: cancellationCode,
			cancellationCode,
		});
	} catch (error) {
		mapIfoodError("requestIfoodOrderCancellation", error);
	}
}

/**
 * Resposta ao cancelamento SOLICITADO pelo cliente/iFood (evento CANCELLATION_REQUESTED / `CAR`).
 *
 * Direção oposta a `requestIfoodOrderCancellation`: ali a loja PEDE o cancelamento; aqui a loja
 * RESPONDE a um pedido que chegou. O evento traz o prazo de resposta — sem resposta dentro dele o
 * iFood decide sozinho e o cenário de homologação reprova.
 *
 * Como as demais ações da Order API, respondem 202 e o desfecho chega como evento CANCELLED.
 */
export async function acceptIfoodOrderCancellation(client: AxiosInstance, orderId: string, reason?: string | null): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/statuses/cancellationRequested/confirm`, reason ? { reason } : {});
	} catch (error) {
		mapIfoodError("acceptIfoodOrderCancellation", error);
	}
}

export async function rejectIfoodOrderCancellation(client: AxiosInstance, orderId: string, reason?: string | null): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/statuses/cancellationRequested/reject`, reason ? { reason } : {});
	} catch (error) {
		mapIfoodError("rejectIfoodOrderCancellation", error);
	}
}
