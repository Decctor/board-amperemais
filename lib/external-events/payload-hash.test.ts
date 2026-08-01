import assert from "node:assert/strict";
import test from "node:test";
import { EXTERNAL_EVENT_HASH_VERSION, computeExternalEventIdempotencyKey } from "./payload-hash";

const PAYLOAD = {
	object: "whatsapp_business_account",
	entry: [
		{ id: "1", changes: [{ field: "messages", value: { metadata: { phone_number_id: "111" } } }] },
		{ id: "2", changes: [{ field: "messages", value: { metadata: { phone_number_id: "222" } } }] },
	],
};

test("chave tem o prefixo de versão e é estável", () => {
	const first = computeExternalEventIdempotencyKey(PAYLOAD);
	assert.ok(first.startsWith(`${EXTERNAL_EVENT_HASH_VERSION}:`));
	assert.equal(computeExternalEventIdempotencyKey(structuredClone(PAYLOAD)), first);
});

test("ordem das chaves de objeto não altera a chave", () => {
	const reordered = { entry: structuredClone(PAYLOAD.entry), object: PAYLOAD.object };
	assert.equal(computeExternalEventIdempotencyKey(reordered), computeExternalEventIdempotencyKey(PAYLOAD));
});

test("ordem de arrays É preservada — arrays trocados alteram a chave", () => {
	const swapped = { ...structuredClone(PAYLOAD), entry: [...PAYLOAD.entry].reverse() };
	assert.notEqual(computeExternalEventIdempotencyKey(swapped), computeExternalEventIdempotencyKey(PAYLOAD));
});

test("conteúdo diferente altera a chave", () => {
	const changed = structuredClone(PAYLOAD);
	changed.entry[0].id = "999";
	assert.notEqual(computeExternalEventIdempotencyKey(changed), computeExternalEventIdempotencyKey(PAYLOAD));
});
