import assert from "node:assert/strict";
import test from "node:test";
import { mapIfoodSale } from "./mappers";
import { IfoodOrderSchema } from "./types";

test("preserva no metadata o pagamento online para impressão independente do financeiro", () => {
	const order = IfoodOrderSchema.parse({
		id: "order-payment-online",
		status: "CONFIRMED",
		createdAt: "2026-08-31T13:30:00.000Z",
		payments: {
			prepaid: 27,
			pending: 0,
			methods: [{ method: "PIX", type: "ONLINE", value: 27, currency: "BRL" }],
		},
	});

	const sale = mapIfoodSale(order);
	assert.deepEqual(sale.integrationMetadata?.pagamentos, {
		prePago: 27,
		pendente: 0,
		metodos: [{ metodo: "PIX", valor: 27, pagoOnline: true, descricao: null }],
	});
});

test("preserva pagamento offline como valor a cobrar na entrega", () => {
	const order = IfoodOrderSchema.parse({
		id: "order-payment-offline",
		status: "CONFIRMED",
		createdAt: "2026-08-31T13:30:00.000Z",
		payments: {
			prepaid: 0,
			pending: 27,
			methods: [{ method: "CASH", type: "OFFLINE", value: 27, currency: "BRL" }],
		},
	});

	const sale = mapIfoodSale(order);
	assert.deepEqual(sale.integrationMetadata?.pagamentos?.metodos, [{ metodo: "DINHEIRO", valor: 27, pagoOnline: false, descricao: null }]);
});
