import assert from "node:assert/strict";
import test from "node:test";
import { mapIfoodSale } from "./mappers";
import { IfoodEventSchema, IfoodOrderSchema } from "./types";

/**
 * Plataforma de Negociação: HANDSHAKE_DISPUTE é a ÚNICA forma de cancelamento que exige resposta
 * da loja (accept/reject/alternative na API de disputes, dentro do prazo do evento). Estes testes
 * fixam o ciclo da pendência `disputaAberta`: abre com o HSD, atravessa eventos intermediários do
 * pedido (a negociação corre em paralelo ao preparo/entrega) e fecha no settlement ou no desfecho
 * terminal do pedido.
 */

const baseOrder = IfoodOrderSchema.parse({
	id: "order-1",
	displayId: "1234",
	status: "CONFIRMED",
	createdAt: "2026-08-27T12:00:00.000Z",
	confirmedAt: "2026-08-27T12:01:00.000Z",
});

const event = (code: string, createdAt: string, metadata?: Record<string, unknown>) =>
	IfoodEventSchema.parse({ id: `evt-${code}-${createdAt}`, code, fullCode: code, orderId: "order-1", createdAt, metadata });

const disputeMetadata = {
	disputeId: "dispute-1",
	action: "CANCELLATION",
	timeoutAction: "ACCEPT_CANCELLATION",
	handshakeType: "PREPARATION_TIME",
	handshakeGroup: "CUSTOMER_ORDER_SUPPORT",
	message: "Pedi errado, quero cancelar",
	expiresAt: "2026-08-27T12:15:00.000Z",
	alternatives: [{ id: "alt-1", type: "REFUND", metadata: { maxAmount: { value: "2700", currency: "BRL" } } }],
};

test("HANDSHAKE_DISPUTE abre a pendência com prazo, motivo e alternativas", () => {
	const sale = mapIfoodSale(baseOrder, [event("HANDSHAKE_DISPUTE", "2026-08-27T12:05:00.000Z", disputeMetadata)]);

	assert.deepEqual(sale.integrationMetadata?.disputaAberta, {
		disputaId: "dispute-1",
		abertaEm: "2026-08-27T12:05:00.000Z",
		expiraEm: "2026-08-27T12:15:00.000Z",
		acao: "CANCELLATION",
		acaoTimeout: "ACCEPT_CANCELLATION",
		tipo: "PREPARATION_TIME",
		mensagem: "Pedi errado, quero cancelar",
		alternativas: [{ id: "alt-1", tipo: "REFUND", valorMaximo: { valor: "2700", moeda: "BRL" } }],
	});
});

test("disputa NÃO é avanço de status: o pedido segue no estágio em que estava", () => {
	const sale = mapIfoodSale(baseOrder, [event("HSD", "2026-08-27T12:05:00.000Z", disputeMetadata)]);

	assert.equal(sale.isCanceled, false);
	assert.equal(sale.statusText, "CONFIRMED");
	assert.equal(sale.attendanceStatus, "EM_PREPARO");
});

test("código curto HSD é reconhecido igual ao código completo", () => {
	const sale = mapIfoodSale(baseOrder, [event("HSD", "2026-08-27T12:05:00.000Z", { disputeId: "dispute-1" })]);
	assert.equal(sale.integrationMetadata?.disputaAberta?.disputaId, "dispute-1");
});

test("disputa sem disputeId é ignorada — sem ID não há como responder", () => {
	const sale = mapIfoodSale(baseOrder, [event("HANDSHAKE_DISPUTE", "2026-08-27T12:05:00.000Z", { message: "sem id" })]);
	assert.equal(sale.integrationMetadata?.disputaAberta, null);
});

test("eventos intermediários do pedido NÃO encerram a disputa — a negociação corre em paralelo", () => {
	const sale = mapIfoodSale(baseOrder, [
		event("HANDSHAKE_DISPUTE", "2026-08-27T12:05:00.000Z", disputeMetadata),
		event("DISPATCHED", "2026-08-27T12:06:00.000Z"),
	]);

	assert.equal(sale.integrationMetadata?.disputaAberta?.disputaId, "dispute-1");
	assert.equal(sale.attendanceStatus, "EM_ENTREGA");
});

test("HANDSHAKE_SETTLEMENT encerra a pendência", () => {
	const sale = mapIfoodSale(baseOrder, [
		event("HANDSHAKE_DISPUTE", "2026-08-27T12:05:00.000Z", disputeMetadata),
		event("HANDSHAKE_SETTLEMENT", "2026-08-27T12:08:00.000Z", { disputeId: "dispute-1", status: "REJECTED" }),
	]);

	assert.equal(sale.integrationMetadata?.disputaAberta, null);
	assert.equal(sale.isCanceled, false);
});

test("cancelamento efetivado encerra a disputa e cancela a venda", () => {
	const sale = mapIfoodSale(baseOrder, [
		event("HANDSHAKE_DISPUTE", "2026-08-27T12:05:00.000Z", disputeMetadata),
		event("CANCELLED", "2026-08-27T12:09:00.000Z"),
	]);

	assert.equal(sale.integrationMetadata?.disputaAberta, null);
	assert.equal(sale.isCanceled, true);
});
