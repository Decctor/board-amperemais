import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyMetaWebhookSignature } from "./webhook-signature";

const APP_SECRET = "test-app-secret";
const RAW_BODY = JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: "123" }] });

function sign(body: string, secret: string) {
	return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

test("assinatura válida passa", () => {
	assert.equal(verifyMetaWebhookSignature({ rawBody: RAW_BODY, signatureHeader: sign(RAW_BODY, APP_SECRET), appSecret: APP_SECRET }), true);
});

test("body adulterado falha", () => {
	const tampered = RAW_BODY.replace("123", "999");
	assert.equal(verifyMetaWebhookSignature({ rawBody: tampered, signatureHeader: sign(RAW_BODY, APP_SECRET), appSecret: APP_SECRET }), false);
});

test("assinatura de outro secret falha", () => {
	assert.equal(verifyMetaWebhookSignature({ rawBody: RAW_BODY, signatureHeader: sign(RAW_BODY, "outro-secret"), appSecret: APP_SECRET }), false);
});

test("header ausente falha", () => {
	assert.equal(verifyMetaWebhookSignature({ rawBody: RAW_BODY, signatureHeader: null, appSecret: APP_SECRET }), false);
});

test("header sem prefixo sha256= falha", () => {
	const bare = sign(RAW_BODY, APP_SECRET).slice("sha256=".length);
	assert.equal(verifyMetaWebhookSignature({ rawBody: RAW_BODY, signatureHeader: bare, appSecret: APP_SECRET }), false);
});

test("assinatura de tamanho errado falha sem lançar", () => {
	assert.equal(verifyMetaWebhookSignature({ rawBody: RAW_BODY, signatureHeader: "sha256=abc", appSecret: APP_SECRET }), false);
});

test("secret ausente falha fechado", () => {
	assert.equal(verifyMetaWebhookSignature({ rawBody: RAW_BODY, signatureHeader: sign(RAW_BODY, APP_SECRET), appSecret: undefined }), false);
});
