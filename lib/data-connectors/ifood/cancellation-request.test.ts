import assert from "node:assert/strict";
import test from "node:test";
import { mapIfoodSale } from "./mappers";
import { IfoodEventSchema, IfoodOrderSchema } from "./types";

/**
 * Semântica do fluxo de cancelamento (doc oficial, validada na 3ª rodada de homologação):
 * `CANCELLATION_REQUESTED` (CAR) é INFORMATIVO — o iFood o emite logo após o requestCancellation
 * da própria loja e ele NÃO exige resposta (não existe endpoint de resposta na Order API v1.0;
 * cancelamento solicitado pelo cliente chega como HANDSHAKE_DISPUTE, na Plataforma de Negociação).
 * O desfecho chega como `CANCELLED` (efetivado) ou `CANCELLATION_REQUEST_FAILED` (rejeitado).
 * Estes testes fixam as regras: a solicitação vira pendência informativa, NÃO é avanço de status,
 * e é encerrada por qualquer desfecho — inclusive a rejeição, que deixa o pedido seguir vivo.
 */

const baseOrder = IfoodOrderSchema.parse({
	id: "order-1",
	displayId: "1234",
	status: "CONFIRMED",
	createdAt: "2026-08-26T19:50:00.000Z",
	confirmedAt: "2026-08-26T19:51:00.000Z",
});

const event = (code: string, createdAt: string, metadata?: Record<string, unknown>) =>
	IfoodEventSchema.parse({ id: `evt-${code}-${createdAt}`, code, fullCode: code, orderId: "order-1", createdAt, metadata });

test("solicitação de cancelamento vira pendência com o motivo do metadata", () => {
	const sale = mapIfoodSale(baseOrder, [event("CANCELLATION_REQUESTED", "2026-08-26T19:56:00.000Z", { cancellationReason: "Cliente desistiu" })]);

	assert.deepEqual(sale.integrationMetadata?.cancelamentoSolicitado, {
		solicitadoEm: "2026-08-26T19:56:00.000Z",
		motivo: "Cliente desistiu",
	});
});

test("código curto CAR é reconhecido igual ao código completo", () => {
	const sale = mapIfoodSale(baseOrder, [event("CAR", "2026-08-26T19:56:00.000Z")]);
	assert.equal(sale.integrationMetadata?.cancelamentoSolicitado?.solicitadoEm, "2026-08-26T19:56:00.000Z");
	assert.equal(sale.integrationMetadata?.cancelamentoSolicitado?.motivo, null);
});

test("solicitação NÃO cancela a venda nem move o status de atendimento", () => {
	const sale = mapIfoodSale(baseOrder, [event("CAR", "2026-08-26T19:56:00.000Z")]);

	assert.equal(sale.isCanceled, false, "pedido de cancelamento não é cancelamento");
	assert.equal(sale.statusText, "CONFIRMED", "o pedido continua no estágio em que estava");
	assert.equal(sale.attendanceStatus, "EM_PREPARO");
});

test("cancelamento efetivado resolve a pendência e cancela a venda", () => {
	const sale = mapIfoodSale(baseOrder, [event("CAR", "2026-08-26T19:56:00.000Z"), event("CANCELLED", "2026-08-26T19:57:00.000Z")]);

	assert.equal(sale.integrationMetadata?.cancelamentoSolicitado, null, "desfecho chegou: pendência encerrada");
	assert.equal(sale.isCanceled, true);
});

test("solicitação rejeitada (CANCELLATION_REQUEST_FAILED) encerra a pendência e o pedido segue vivo", () => {
	const sale = mapIfoodSale(baseOrder, [event("CAR", "2026-08-26T19:56:00.000Z"), event("CANCELLATION_REQUEST_FAILED", "2026-08-26T19:57:00.000Z")]);

	assert.equal(sale.integrationMetadata?.cancelamentoSolicitado, null);
	assert.equal(sale.isCanceled, false);
	assert.equal(sale.statusText, "CONFIRMED", "CARF não é transição de ciclo");
	assert.equal(sale.attendanceStatus, "EM_PREPARO");
});

test("código curto CARF é reconhecido igual ao código completo", () => {
	const sale = mapIfoodSale(baseOrder, [event("CAR", "2026-08-26T19:56:00.000Z"), event("CARF", "2026-08-26T19:57:00.000Z")]);

	assert.equal(sale.integrationMetadata?.cancelamentoSolicitado, null);
	assert.equal(sale.isCanceled, false);
});

test("solicitação negada — pedido segue e a pendência some", () => {
	const sale = mapIfoodSale(baseOrder, [event("CAR", "2026-08-26T19:56:00.000Z"), event("DISPATCHED", "2026-08-26T19:58:00.000Z")]);

	assert.equal(sale.integrationMetadata?.cancelamentoSolicitado, null);
	assert.equal(sale.isCanceled, false);
	assert.equal(sale.attendanceStatus, "EM_ENTREGA");
});

test("evento fora de ordem: solicitação que chega depois do cancelamento não reabre pendência", () => {
	const sale = mapIfoodSale(baseOrder, [event("CANCELLED", "2026-08-26T19:57:00.000Z"), event("CAR", "2026-08-26T19:56:00.000Z")]);

	assert.equal(sale.integrationMetadata?.cancelamentoSolicitado, null);
	assert.equal(sale.isCanceled, true);
});
