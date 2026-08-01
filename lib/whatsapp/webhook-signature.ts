import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verificação da assinatura `x-hub-signature-256` dos webhooks da Meta.
 *
 * A Meta assina o corpo **cru** do POST com HMAC-SHA256 usando o App Secret. A verificação
 * precisa rodar sobre os bytes exatamente como chegaram (`req.text()`), antes de qualquer
 * `JSON.parse` — re-serializar o body quebra a assinatura.
 *
 * Fail-closed: sem `META_APP_SECRET` configurado ou sem header válido, o webhook é
 * rejeitado. O verify token do GET autentica apenas o handshake de subscrição, não as
 * deliveries.
 */
export function verifyMetaWebhookSignature({
	rawBody,
	signatureHeader,
	appSecret = process.env.META_APP_SECRET,
}: {
	rawBody: string;
	signatureHeader: string | null;
	appSecret?: string;
}): boolean {
	if (!appSecret) {
		console.error("[WHATSAPP_WEBHOOK] META_APP_SECRET ausente — rejeitando webhook (fail-closed).");
		return false;
	}
	if (!signatureHeader?.startsWith("sha256=")) return false;

	const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"), "utf8");
	const provided = Buffer.from(signatureHeader.slice("sha256=".length), "utf8");

	// timingSafeEqual exige buffers do mesmo tamanho; tamanhos diferentes já são mismatch.
	if (expected.length !== provided.length) return false;
	return timingSafeEqual(expected, provided);
}
