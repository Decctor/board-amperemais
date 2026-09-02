import assert from "node:assert/strict";
import test from "node:test";
import { mapIfoodSale } from "./mappers";
import { IfoodOrderSchema } from "./types";

/**
 * Invariantes de dinheiro do pedido iFood:
 *   valorTotal = itens brutos - desconto da loja + frete proprio   (= vNF)
 *   soma(ENTRADA) - soma(SAIDA) = valorTotal
 * ENTRADA sao os `payments` (cliente + patrocinio) e SAIDA sao as `taxasCanal`.
 */
function buildOrder({ deliveredBy }: { deliveredBy: string }) {
	return IfoodOrderSchema.parse({
		id: `order-${deliveredBy}`,
		status: "CONFIRMED",
		createdAt: "2026-09-01T12:00:00.000Z",
		delivery: { deliveredBy },
		// 100 de itens, 8 de frete, 3 de taxa do canal, 10 patrocinados pelo iFood.
		total: { subTotal: 100, deliveryFee: 8, benefits: 10, orderAmount: 101, additionalFees: 3 },
		benefits: [{ value: 10, target: "CART", sponsorshipValues: [{ name: "IFOOD", value: 10 }] }],
		additionalFees: [{ type: "SERVICE_FEE", value: 3 }],
		payments: { prepaid: 101, pending: 0, methods: [{ method: "CREDIT", type: "ONLINE", value: 101, currency: "BRL" }] },
	});
}

function assertTransactionsMatchTotal(sale: ReturnType<typeof mapIfoodSale>) {
	const entradas = (sale.payments ?? []).reduce((sum, payment) => sum + payment.valor, 0);
	const saidas = (sale.integrationMetadata?.taxasCanal ?? []).reduce((sum, fee) => sum + fee.valor, 0);
	assert.equal(Math.round((entradas - saidas) * 100) / 100, sale.totalValue);
}

test("entrega do canal: o frete nao e receita da loja — fica fora do total e vira taxa do canal", () => {
	const sale = mapIfoodSale(buildOrder({ deliveredBy: "IFOOD" }));

	assert.equal(sale.totalValue, 100);
	assert.equal(sale.totalSurcharge, 0);
	assert.deepEqual(sale.integrationMetadata?.taxasCanal, [
		{ tipo: "SERVICE_FEE", valor: 3 },
		{ tipo: "DELIVERY_FEE_CANAL", valor: 8 },
	]);
	assertTransactionsMatchTotal(sale);
});

test("entrega propria: o frete e receita da loja — entra no total e nao vira taxa do canal", () => {
	const sale = mapIfoodSale(buildOrder({ deliveredBy: "MERCHANT" }));

	assert.equal(sale.totalValue, 108);
	assert.equal(sale.totalSurcharge, 8);
	assert.equal(sale.integrationMetadata?.entrega.realizadaPor, "LOJA");
	assert.deepEqual(sale.integrationMetadata?.taxasCanal, [{ tipo: "SERVICE_FEE", valor: 3 }]);
	assertTransactionsMatchTotal(sale);
});

test("desconto patrocinado nao reduz o total: vira pagamento VALE do patrocinador", () => {
	const sale = mapIfoodSale(buildOrder({ deliveredBy: "IFOOD" }));

	assert.equal(sale.totalDiscount, 0);
	assert.deepEqual(
		(sale.payments ?? []).map(({ metodo, valor }) => ({ metodo, valor })),
		[
			{ metodo: "CARTAO_CREDITO", valor: 101 },
			{ metodo: "VALE", valor: 10 },
		],
	);
});

test("desconto da loja reduz o total e o frete proprio continua somando", () => {
	const order = IfoodOrderSchema.parse({
		id: "order-merchant-discount",
		status: "CONFIRMED",
		createdAt: "2026-09-01T12:00:00.000Z",
		delivery: { deliveredBy: "MERCHANT" },
		total: { subTotal: 100, deliveryFee: 8, benefits: 10, orderAmount: 98, additionalFees: 0 },
		benefits: [{ value: 10, target: "CART", sponsorshipValues: [{ name: "MERCHANT", value: 10 }] }],
		payments: { prepaid: 98, pending: 0, methods: [{ method: "PIX", type: "ONLINE", value: 98, currency: "BRL" }] },
	});

	const sale = mapIfoodSale(order);

	assert.equal(sale.totalDiscount, 10);
	assert.equal(sale.totalValue, 98);
	assertTransactionsMatchTotal(sale);
});
