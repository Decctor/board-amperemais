import assert from "node:assert/strict";
import test from "node:test";
import { buildSpedyIntegrationId } from "./mappers/utils";
import {
	extractSpedyOutboundInvoice,
	isSpedyOutboundWebhookEvent,
	matchesSpedyIntegrationId,
} from "./webhook";

test("reconhece apenas o webhook consolidado de status de notas emitidas", () => {
	assert.equal(isSpedyOutboundWebhookEvent("invoice.status_changed"), true);
	assert.equal(isSpedyOutboundWebhookEvent("invoice.rejected"), false);
	assert.equal(isSpedyOutboundWebhookEvent("inbound_invoice.completed"), false);
});

test("aceita nota emitida ainda sem chave de acesso", () => {
	const invoice = extractSpedyOutboundInvoice({
		id: "spedy-event",
		event: "invoice.status_changed",
		data: {
			id: "spedy-document",
			status: "enqueued",
			integrationId: "local-integration",
			company: { federalTaxNumber: "12345678000199" },
		},
	});

	assert.equal(invoice?.id, "spedy-document");
	assert.equal(invoice?.status, "enqueued");
});

test("rejeita payload outbound com status desconhecido", () => {
	assert.equal(
		extractSpedyOutboundInvoice({
			id: "spedy-event",
			event: "invoice.status_changed",
			data: { id: "spedy-document", status: "unexpected" },
		}),
		null,
	);
});

test("rejeita webhook outbound sem id para garantir idempotencia", () => {
	assert.equal(
		extractSpedyOutboundInvoice({
			event: "invoice.status_changed",
			data: { id: "spedy-document", status: "authorized" },
		}),
		null,
	);
});

test("associa o webhook pelo integrationId persistido ou recomposto", () => {
	const identity = {
		referencia: "VENDA:1234567890",
		numero: "42",
		tentativasEnvio: 2,
		provedorPayload: null,
	};
	const recomputed = buildSpedyIntegrationId(`${identity.referencia}:n:42:a:2`);
	assert.equal(matchesSpedyIntegrationId(identity, recomputed), true);
	assert.equal(
		matchesSpedyIntegrationId({ ...identity, provedorPayload: JSON.stringify({ integrationId: "stored-id" }) }, "stored-id"),
		true,
	);
});
