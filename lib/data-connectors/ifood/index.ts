import type { TCanonicalImportWindow } from "../types";
import { createIfoodClient, getIfoodOrder, getValidIfoodConfig, acknowledgeIfoodEvents, pollIfoodEvents } from "./client";
import { toCanonicalIfoodImportBatch } from "./mappers";
import { IfoodConfigSchema, type TIfoodEvent } from "./types";

const IFOOD_RELEVANT_ORDER_EVENT_CODES = new Set(["PLC", "CFM", "CON", "CAN", "PLACED", "CONFIRMED", "CONCLUDED", "CANCELLED", "CANCELED"]);

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
	config,
	window,
}: {
	organizationId: string;
	config: unknown;
	window: TCanonicalImportWindow;
}) {
	const parsedConfig = IfoodConfigSchema.parse(config);
	const validConfig = await getValidIfoodConfig({ organizationId, config: parsedConfig });
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
