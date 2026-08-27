import { IFOOD_ORDER_BASE_URL } from "@/lib/data-connectors/ifood/types";
import type { AxiosInstance } from "axios";
import { mapIfoodError } from "./errors";

/**
 * Plataforma de Negociação (handshake): resposta às disputas de cancelamento abertas pelo
 * cliente/iFood (evento HANDSHAKE_DISPUTE). A disputa tem prazo (`expiresAt`) — sem resposta o
 * iFood executa a ação de timeout do evento. O desfecho chega como HANDSHAKE_SETTLEMENT no
 * polling; como as demais ações da Order API, os endpoints respondem 202.
 *
 * Valores monetários da plataforma trafegam em centavos como string (ex.: "5000" = R$ 50,00),
 * no mesmo formato do `maxAmount` recebido no evento.
 */

export async function acceptIfoodDispute(client: AxiosInstance, disputeId: string, reason?: string | null): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/disputes/${disputeId}/accept`, reason ? { reason } : {});
	} catch (error) {
		mapIfoodError("acceptIfoodDispute", error);
	}
}

export async function rejectIfoodDispute(client: AxiosInstance, disputeId: string, reason?: string | null): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/disputes/${disputeId}/reject`, reason ? { reason } : {});
	} catch (error) {
		mapIfoodError("rejectIfoodDispute", error);
	}
}

/**
 * Contraproposta (ex.: reembolso parcial em vez de cancelar). Só é válida quando a disputa traz a
 * alternativa correspondente em `alternatives`; o valor não pode exceder o `maxAmount` recebido.
 */
export async function proposeIfoodDisputeAlternative(
	client: AxiosInstance,
	disputeId: string,
	{ type, amountValue, currency }: { type: string; amountValue: string; currency: string },
): Promise<void> {
	try {
		await client.post(`${IFOOD_ORDER_BASE_URL}/disputes/${disputeId}/alternative`, {
			type,
			metadata: { amount: { value: amountValue, currency } },
		});
	} catch (error) {
		mapIfoodError("proposeIfoodDisputeAlternative", error);
	}
}
