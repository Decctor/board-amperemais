import assert from "node:assert/strict";
import test from "node:test";
import { mapIfoodSale } from "./mappers";
import { IfoodOrderSchema } from "./types";

function parseOrder(phone: unknown) {
	return IfoodOrderSchema.parse({
		id: "order-phone",
		status: "CONFIRMED",
		createdAt: "2026-09-01T18:00:00.000Z",
		customer: { id: "customer-1", name: "Cliente", phone },
	});
}

test("0800 do iFood não vira telefone cadastral e preserva a rota temporária no metadata", () => {
	const sale = mapIfoodSale(
		parseOrder({
			number: "0800 705 1020",
			localizer: "27534642",
			localizerExpiration: "2026-09-01T22:00:00.000Z",
		}),
	);

	assert.equal(sale.client?.phone, "");
	assert.equal(sale.client?.basePhone, "");
	assert.equal(sale.client?.phoneIsTemporary, true);
	assert.deepEqual(sale.integrationMetadata?.contatoTemporario, {
		telefone: "0800 705 1020",
		localizador: "27534642",
		expiraEm: "2026-09-01T22:00:00.000Z",
	});
});

test("telefone real continua sendo cadastrado normalmente", () => {
	const sale = mapIfoodSale(parseOrder({ number: "34999998888" }));

	assert.equal(sale.client?.phone, "(34) 99999-8888");
	assert.equal(sale.client?.basePhone, "3499998888");
	assert.equal(sale.client?.phoneIsTemporary, false);
	assert.equal(sale.integrationMetadata?.contatoTemporario, null);
});

test("payload legado com telefone primitivo continua aceito", () => {
	const order = parseOrder("34999998888");

	assert.deepEqual(order.customer?.phone, {
		number: "34999998888",
		localizer: null,
		localizerExpiration: null,
	});
});
