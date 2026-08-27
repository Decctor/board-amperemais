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

/**
 * Cancelamento iniciado pela LOJA. O body documentado é apenas `{ reason: "<código>" }` — o código
 * numérico de /cancellationReasons vai em `reason`. Responde 202; o desfecho chega pelo polling
 * como CANCELLED (aceito) ou CANCELLATION_REQUEST_FAILED (rejeitado). O CANCELLATION_REQUESTED
 * emitido logo após é só o registro da solicitação — não existe endpoint de resposta a ele
 * (cancelamento solicitado pelo cliente é negociado na Plataforma de Negociação, via
 * HANDSHAKE_DISPUTE).
 */
export async function requestIfoodOrderCancellation(client: AxiosInstance, orderId: string, cancellationCode: string): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}/requestCancellation`, { reason: cancellationCode });
	} catch (error) {
		mapIfoodError("requestIfoodOrderCancellation", error);
	}
}
