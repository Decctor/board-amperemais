import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import type { TEmitirDocumentoInput } from "./types";

export const FISCAL_STORAGE_PREFIX = "public/organizations/fiscal";

export const SUPPORTED_AUTOMATIC_DOCUMENT_TYPES: TFiscalDocumentTypeEnum[] = ["NFCE", "NFE"];

export function buildFiscalReference(input: Pick<TEmitirDocumentoInput, "organizacaoId" | "vendaId" | "tipo">) {
	return `org:${input.organizacaoId}:sale:${input.vendaId}:tipo:${input.tipo}`;
}

