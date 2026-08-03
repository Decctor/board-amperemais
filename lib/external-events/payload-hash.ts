import { createHash } from "node:crypto";

/**
 * Chave de idempotência de um payload de evento externo: hash canônico versionado do body.
 *
 * Diferente da assinatura de vendas (lib/data-collecting-v2/sale-signature.ts), aqui a
 * **ordem de arrays é preservada**: em payloads de provider a ordem pode ser semântica
 * (entries/changes da Meta, por exemplo), e ordená-los poderia colapsar payloads distintos.
 * Só a ordem de chaves de objeto é normalizada — JSON não dá garantia sobre ela.
 *
 * O input é JSON já parseado (sem `Date`/`undefined` — `JSON.parse` não os produz).
 */
export const EXTERNAL_EVENT_HASH_VERSION = "v1";

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				// Comparação por code unit (não localeCompare): o hash não pode depender do locale.
				.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
				.map(([key, nestedValue]) => [key, canonicalize(nestedValue)]),
		);
	}
	return value;
}

export function computeExternalEventIdempotencyKey(payload: unknown): string {
	const canonical = JSON.stringify(canonicalize(payload));
	return `${EXTERNAL_EVENT_HASH_VERSION}:${createHash("sha256").update(canonical).digest("hex")}`;
}
