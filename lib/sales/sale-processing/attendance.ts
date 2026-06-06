import type { TDeliveryModeEnum, TSaleAttendanceStatusEnum } from "@/schemas/enums";

/**
 * Helpers puros para o eixo operacional de atendimento (fulfillment) da venda.
 */

/**
 * Resolve o status de atendimento inicial de uma venda confirmada internamente,
 * conforme a modalidade de entrega.
 *
 * - PRESENCIAL: ENTREGUE (venda de balcao, entrega imediata);
 * - RETIRADA: PRONTO (aguardando o cliente retirar);
 * - ENTREGA: EM_PREPARO (precisa ser preparada e despachada);
 * - COMANDA: EM_PREPARO (consumo no local em andamento);
 * - sem modalidade: ENTREGUE (tratado como venda imediata).
 */
export function resolveInitialAttendanceStatus(modalidade: TDeliveryModeEnum | null | undefined): TSaleAttendanceStatusEnum {
	switch (modalidade) {
		case "RETIRADA":
			return "PRONTO";
		case "ENTREGA":
			return "EM_PREPARO";
		case "COMANDA":
			return "EM_PREPARO";
		case "PRESENCIAL":
			return "ENTREGUE";
		default:
			return "ENTREGUE";
	}
}

// Transicoes operacionais permitidas. Cancelamento operacional e tratado separadamente.
const ALLOWED_ATTENDANCE_TRANSITIONS: Record<TSaleAttendanceStatusEnum, TSaleAttendanceStatusEnum[]> = {
	NAO_INICIADO: ["EM_PREPARO", "PRONTO", "ENTREGUE", "CANCELADO"],
	EM_PREPARO: ["PRONTO", "EM_ENTREGA", "ENTREGUE", "CANCELADO"],
	PRONTO: ["EM_ENTREGA", "ENTREGUE", "PARCIALMENTE_ENTREGUE", "CANCELADO"],
	EM_ENTREGA: ["ENTREGUE", "PARCIALMENTE_ENTREGUE", "CANCELADO"],
	PARCIALMENTE_ENTREGUE: ["ENTREGUE", "CANCELADO"],
	ENTREGUE: [],
	CANCELADO: [],
};

export function isValidAttendanceTransition(from: TSaleAttendanceStatusEnum, to: TSaleAttendanceStatusEnum): boolean {
	if (from === to) return false;
	return ALLOWED_ATTENDANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Indica se a transicao para o status alvo exige saida fisica de estoque (baixa).
 * A baixa fisica acontece na entrega efetiva do pedido.
 */
export function attendanceStatusRequiresPhysicalOut(status: TSaleAttendanceStatusEnum): boolean {
	return status === "ENTREGUE" || status === "PARCIALMENTE_ENTREGUE";
}
