import type { TSaleAttendanceStatusEnum, TSaleStatusEnum } from "@/schemas/enums";

/**
 * Mappers explicitos de status de integracoes externas para os eixos da plataforma.
 *
 * Principio: "dumb receiver, smart creator". Vendas externas sao recebidas com o minimo de
 * interpretacao possivel. Cada conector deve traduzir seus status atraves destes mappers
 * explicitos, em vez de espalhar regras de traducao dentro de APIs ou componentes.
 *
 * O fallback deve ser conservador: e melhor mostrar menos pipeline do que inventar uma etapa
 * operacional que a integracao nao garantiu.
 */

/**
 * Traduz o status comercial de uma integracao generica para o status comercial da venda.
 * O fallback assume CONFIRMADA (vendas externas geralmente chegam ja concluidas).
 */
export function mapExternalCommercialStatus(status: string | null | undefined): TSaleStatusEnum {
	switch ((status ?? "").toLowerCase()) {
		case "draft":
		case "pending":
		case "open":
			return "ORCAMENTO";
		case "confirmed":
		case "paid":
		case "completed":
		case "closed":
			return "CONFIRMADA";
		case "cancelled":
		case "canceled":
		case "refunded":
			return "CANCELADA";
		default:
			return "CONFIRMADA";
	}
}

/**
 * Traduz o status operacional de uma integracao generica para o status de atendimento da venda.
 * Retorna null quando a integracao nao fornece granularidade operacional confiavel; nesse caso
 * o chamador deve usar um valor neutro (ex.: "NAO_INICIADO").
 */
export function mapExternalAttendanceStatus(status: string | null | undefined): TSaleAttendanceStatusEnum | null {
	switch ((status ?? "").toLowerCase()) {
		case "preparing":
		case "in_preparation":
			return "EM_PREPARO";
		case "ready":
			return "PRONTO";
		case "out_for_delivery":
		case "dispatched":
			return "EM_ENTREGA";
		case "delivered":
		case "completed":
		case "concluded":
			return "ENTREGUE";
		case "cancelled":
		case "canceled":
			return "CANCELADO";
		default:
			return null;
	}
}
