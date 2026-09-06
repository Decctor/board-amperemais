import assert from "node:assert/strict";
import test from "node:test";
import { mapIfoodSale } from "./mappers";
import { IfoodOrderSchema, type TIfoodEvent } from "./types";

test("a data da venda permanece na criação ao confirmar e concluir o pedido", () => {
	const order = IfoodOrderSchema.parse({
		id: "order-date",
		createdAt: "2026-09-05T21:49:50.679-03:00",
	});
	const events: TIfoodEvent[] = [
		{ id: "confirmed", orderId: order.id, code: "CFM", fullCode: "CONFIRMED", createdAt: "2026-09-06T00:50:00.000Z" },
		{ id: "concluded", orderId: order.id, code: "CON", fullCode: "CONCLUDED", createdAt: "2026-09-06T05:44:47.423Z" },
	];
	for (const currentEvents of [[], events.slice(0, 1), events]) {
		assert.equal(mapIfoodSale(order, currentEvents).occurredAt.toISOString(), "2026-09-06T00:49:50.679Z");
	}
	assert.equal(
		mapIfoodSale({ ...order, confirmedAt: events[0].createdAt ?? null, concludedAt: events[1].createdAt ?? null }, events).occurredAt.toISOString(),
		"2026-09-06T00:49:50.679Z",
	);
});

test("criação ausente ou inválida falha mesmo com data de conclusão disponível", () => {
	for (const createdAt of [undefined, null, "", "invalid"]) {
		const order = IfoodOrderSchema.parse({ id: "order-invalid-date", createdAt, concludedAt: "2026-09-06T05:44:47.423Z" });
		assert.throws(() => mapIfoodSale(order), /Data inválida recebida do iFood/);
	}
});
