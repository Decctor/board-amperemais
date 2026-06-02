import type { TSaleAttendanceStatusEnum, TSaleStatusEnum } from "@/schemas/enums";

/**
 * Mapper explicito e centralizado de vendas de integracoes para os eixos de status da plataforma.
 *
 * Principio: "dumb receiver, smart creator". A traducao do status especifico de cada integracao
 * (ex.: ifood "CONFIRMED/CANCELLED", cardapio-web "closed/canceled", online-software natureza
 * "SN01") ja acontece em cada conector, que normaliza tudo para os sinais canonicos
 * `isValidSale` e `isCanceled`. Aqui apenas mapeamos esses sinais canonicos para o status
 * comercial e operacional da venda, em um unico lugar — sem espalhar regras de traducao dentro
 * de APIs, componentes ou na rotina de sincronizacao.
 *
 * Observacao: o canonical ainda nao carrega granularidade de fulfillment (preparo/entrega) das
 * integracoes. Quando carregar (ex.: estados intermediarios do ifood), este mapper deve passar
 * a consumir esse campo para `statusAtendimento`.
 */

type CanonicalSaleStatusSignals = {
	isValidSale: boolean;
	isCanceled: boolean;
};

/**
 * Status comercial derivado dos sinais canonicos da integracao.
 * - cancelada: CANCELADA;
 * - venda valida/concluida: CONFIRMADA;
 * - caso contrario (pendente/indefinida): null (neutro, "dumb receiver").
 */
export function mapCanonicalSaleCommercialStatus({ isValidSale, isCanceled }: CanonicalSaleStatusSignals): TSaleStatusEnum | null {
	if (isCanceled) return "CANCELADA";
	if (isValidSale) return "CONFIRMADA";
	return null;
}

/**
 * Status operacional derivado dos sinais canonicos da integracao.
 * Vendas externas chegam como historico concluido (ENTREGUE) ou canceladas (CANCELADO).
 * Sem sinal confiavel, mantem o valor neutro NAO_INICIADO.
 */
export function mapCanonicalSaleAttendanceStatus({ isValidSale, isCanceled }: CanonicalSaleStatusSignals): TSaleAttendanceStatusEnum {
	if (isCanceled) return "CANCELADO";
	if (isValidSale) return "ENTREGUE";
	return "NAO_INICIADO";
}
