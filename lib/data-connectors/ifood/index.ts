import type { TCanonicalImportWindow } from "../types";
import { createIfoodClient, getIfoodOrder, getValidIfoodConfig, acknowledgeIfoodEvents, pollIfoodEvents } from "./client";
import { toCanonicalIfoodImportBatch } from "./mappers";
import { IfoodConfigSchema, type TIfoodEvent } from "./types";

// Inclui as etapas intermediarias do ciclo (preparo/pronto/despacho) para que acoes feitas em
// outros devices (ex.: Gestor de Pedidos) movam o quadro de atendimento via ingestao.
const IFOOD_RELEVANT_ORDER_EVENT_CODES = new Set([
	"PLC",
	"CFM",
	"PRS",
	"SPS",
	"SPE",
	"RTP",
	"DSP",
	"COL",
	"CON",
	"CAN",
	"CAR",
	"PLACED",
	"CONFIRMED",
	"PREPARATION_STARTED",
	"SEPARATION_STARTED",
	"SEPARATION_ENDED",
	"READY_TO_PICKUP",
	"DISPATCHED",
	"COLLECTED",
	"CONCLUDED",
	"CANCELLED",
	"CANCELED",
	// Cancelamento SOLICITADO (ainda nao efetivado): informativo, emitido logo apos o
	// requestCancellation da propria loja — nao exige resposta (o desfecho chega como CANCELLED ou
	// CANCELLATION_REQUEST_FAILED). Entra na ingestao para a venda registrar a pendencia.
	"CANCELLATION_REQUESTED",
	// Solicitacao REJEITADA: sem ela na lista a pendencia acima nunca seria encerrada quando o
	// iFood nega o cancelamento e o pedido segue vivo.
	"CARF",
	"CANCELLATION_REQUEST_FAILED",
	// Plataforma de Negociacao: disputa aberta pelo cliente/iFood — EXIGE resposta da loja antes
	// do prazo (accept/reject/alternative na API de disputes), senao o iFood executa a acao de
	// timeout. O settlement entra para disparar o remapeamento que encerra a pendencia.
	"HSD",
	"HANDSHAKE_DISPUTE",
	"HSS",
	"HANDSHAKE_SETTLEMENT",
]);

function getRelevantOrderEvents(events: TIfoodEvent[]) {
	return events.filter((event) => {
		if (!event.orderId) return false;
		const eventCode = event.code.toUpperCase();
		const eventFullCode = event.fullCode?.toUpperCase();
		return IFOOD_RELEVANT_ORDER_EVENT_CODES.has(eventCode) || (eventFullCode ? IFOOD_RELEVANT_ORDER_EVENT_CODES.has(eventFullCode) : false);
	});
}

function uniqueOrderIds(events: TIfoodEvent[]) {
	return Array.from(new Set(events.map((event) => event.orderId).filter((orderId): orderId is string => !!orderId)));
}

export async function fetchIfoodImportBatch({
	organizationId,
	integrationId,
	config,
	window,
}: {
	organizationId: string;
	integrationId: string;
	config: unknown;
	window: TCanonicalImportWindow;
}) {
	const parsedConfig = IfoodConfigSchema.parse(config);
	const validConfig = await getValidIfoodConfig({ integrationId, config: parsedConfig });
	const client = createIfoodClient(validConfig);
	const events = await pollIfoodEvents(client, { merchantIds: validConfig.merchantIds });
	const relevantEvents = getRelevantOrderEvents(events);
	const orderIds = uniqueOrderIds(relevantEvents);
	const orders = await Promise.all(orderIds.map((orderId) => getIfoodOrder(client, orderId)));
	const eventIds = events.map((event) => event.id);

	return toCanonicalIfoodImportBatch({
		organizationId,
		window,
		orders,
		events,
		postProcess: eventIds.length ? () => acknowledgeIfoodEvents(client, eventIds) : undefined,
	});
}

export * from "./client";
export * from "./mappers";
export * from "./types";
