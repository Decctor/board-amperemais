import type { TCanonicalImportWindow } from "../types";
import { createIfoodClient, getIfoodOrder, getValidIfoodConfig, acknowledgeIfoodEvents, pollIfoodEvents } from "./client";
import { toCanonicalIfoodImportBatch } from "./mappers";
import { IfoodConfigSchema, type TIfoodEvent } from "./types";

const IFOOD_RELEVANT_ORDER_EVENT_CODES = new Set(["PLACED", "CONFIRMED", "CONCLUDED", "CANCELLED", "CANCELED"]);

function getRelevantOrderEvents(events: TIfoodEvent[]) {
	return events.filter((event) => event.orderId && IFOOD_RELEVANT_ORDER_EVENT_CODES.has(event.code.toUpperCase()));
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
	const events = await pollIfoodEvents(client);
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
