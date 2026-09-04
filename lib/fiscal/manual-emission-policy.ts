import type { TFiscalDocumentLifecycleStatusEnum } from "@/schemas/enums";

const RETRYABLE_STATUSES = new Set<TFiscalDocumentLifecycleStatusEnum>(["ERRO", "REJEITADO"]);
const CLOSED_STATUSES = new Set<TFiscalDocumentLifecycleStatusEnum>(["CANCELADO", "INUTILIZADO"]);

/**
 * A failed/rejected document is the retry target, not a second live document.
 * Unknown statuses block conservatively to preserve emission idempotency.
 */
export function blocksNewManualFiscalEmission(status: string | null | undefined) {
	if (!status) return true;
	if (RETRYABLE_STATUSES.has(status as TFiscalDocumentLifecycleStatusEnum)) return false;
	if (CLOSED_STATUSES.has(status as TFiscalDocumentLifecycleStatusEnum)) return false;
	return true;
}

