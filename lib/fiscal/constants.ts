import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import type { TEmitirDocumentoInput } from "./types";

export const FISCAL_STORAGE_PREFIX = "fiscal";

export const SUPPORTED_AUTOMATIC_DOCUMENT_TYPES: TFiscalDocumentTypeEnum[] = ["NFCE", "NFE"];

/**
 * Prazos legais adotados como padrao do produto. Cancelamento varia por UF (algumas SEFAZ aceitam
 * 24h para NFC-e); por ora o padrao e unico, em codigo. Cancelamento extemporaneo nao e suportado
 * pelo provedor (Spedy) — fora da janela, a saida e devolucao ou carta de correcao.
 */
export const FISCAL_DEADLINES = {
	cancelamentoNfceMinutos: 30,
	cancelamentoNfeHoras: 24,
	// Limite legal de eventos de carta de correcao por NF-e; a ultima substitui as anteriores.
	cartaCorrecaoMaxEventos: 20,
	// Inutilizacao deve ser pedida ate o dia 10 do mes seguinte ao da numeracao reservada.
	inutilizacaoDiaLimiteMesSeguinte: 10,
	// Documento parado em processamento alem disto merece atencao do operador.
	processamentoAlertaMinutos: 15,
} as const;

export type TFiscalDeadlines = typeof FISCAL_DEADLINES;

export function buildFiscalReference(input: Pick<TEmitirDocumentoInput, "organizacaoId" | "vendaId" | "tipo" | "documentoOrigemId">) {
	const base = `v:${input.vendaId}:t:${input.tipo}`;
	// Devolucao referencia a mesma venda/tipo da original; sufixo evita colisao de referencia.
	return input.documentoOrigemId ? `${base}:dev:${input.documentoOrigemId}` : base;
}
