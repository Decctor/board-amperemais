import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import type { TEmitirDocumentoInput } from "./types";

export const FISCAL_STORAGE_PREFIX = "public/organizations/fiscal";

export const SUPPORTED_AUTOMATIC_DOCUMENT_TYPES: TFiscalDocumentTypeEnum[] = ["NFCE", "NFE"];

export function buildFiscalReference(input: Pick<TEmitirDocumentoInput, "organizacaoId" | "vendaId" | "tipo" | "documentoOrigemId">) {
	const base = `v:${input.vendaId}:t:${input.tipo}`;
	// Devolucao referencia a mesma venda/tipo da original; sufixo evita colisao de referencia.
	return input.documentoOrigemId ? `${base}:dev:${input.documentoOrigemId}` : base;
}

