import assert from "node:assert/strict";
import test from "node:test";
import { shouldProcessIntegratedSaleConfirmation } from "./integrated-sale-confirmation-policy";

test("allows an unconfirmed order awaiting acceptance", () => {
	assert.equal(shouldProcessIntegratedSaleConfirmation({ statusVenda: null, statusAtendimento: "NAO_INICIADO" }), true);
});

test("uses CONFIRMADA as the temporary idempotency marker", () => {
	assert.equal(shouldProcessIntegratedSaleConfirmation({ statusVenda: "CONFIRMADA", statusAtendimento: "EM_PREPARO" }), false);
});

test("does not rewind an order that already advanced operationally", () => {
	assert.equal(shouldProcessIntegratedSaleConfirmation({ statusVenda: null, statusAtendimento: "EM_PREPARO" }), false);
});
