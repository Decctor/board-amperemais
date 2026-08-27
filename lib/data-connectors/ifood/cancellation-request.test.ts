import assert from "node:assert/strict";
import test from "node:test";
import { mapIfoodSale } from "./mappers";
import { IfoodEventSchema, IfoodOrderSchema } from "./types";

/**
 * O cenário "Pedido Cancelado" da homologação reprovou duas vezes porque o evento de cancelamento
 * SOLICITADO (`CAR`) era filtrado da ingestão e ACKado adiante — consumido da fila sem resposta.
 * Estes testes fixam as duas metades da regra: a solicitação precisa aparecer como pendência, e
 * NÃO pode ser confundida com avanço de status (o pedido segue vivo se a solicitação for negada).
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

	assert.equal(sale.integrationMetadata?.cancelamentoSolicitado, null, "respondido: não pode reenviar resposta");
	assert.equal(sale.isCanceled, true);
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
