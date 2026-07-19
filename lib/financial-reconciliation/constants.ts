// Constantes do módulo de conciliação bancária (docs/bank-reconciliation-design.md).

// Mesma tolerância de valor usada na validação de lançamentos contábeis (accounting-entries).
export const RECONCILIATION_VALUE_TOLERANCE = 0.02;

// Janelas de data do matching: estágio A (exato) e estágio B (heurístico).
export const EXACT_MATCH_DATE_WINDOW_DAYS = 2;
export const HEURISTIC_MATCH_DATE_WINDOW_DAYS = 7;

// Score mínimo (0..1) para uma sugestão heurística ser registrada.
export const HEURISTIC_MATCH_MIN_SCORE = 0.6;

// Estágio C (IA): candidatos por linha e confiança mínima — molde de lib/purchase/match-products.ts.
export const AI_MATCH_MODEL = "anthropic/claude-haiku-4.5";
export const AI_MATCH_MIN_CONFIDENCE = 0.5;
export const AI_MATCH_CANDIDATES_PER_LINE = 5;
export const AI_MATCH_MAX_LINES_PER_CALL = 40;

// Extração de documento (PDF/imagem) usa visão — Sonnet, como o import de compras.
export const STATEMENT_EXTRACTION_MODEL = "anthropic/claude-sonnet-4.5";

// Mapeamento IA de colunas de planilha — barato, Haiku.
export const COLUMN_MAP_MODEL = "anthropic/claude-haiku-4.5";

export const STATEMENT_IMPORT_ALLOWED_MIME_TYPES = [
	"application/x-ofx",
	"text/csv",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/webp",
] as const;
export type TStatementImportMimeType = (typeof STATEMENT_IMPORT_ALLOWED_MIME_TYPES)[number];

// Extensões que não chegam com mime confiável do storage (OFX vira octet-stream com frequência).
export const STATEMENT_OFX_EXTENSIONS = [".ofx", ".qfx"];

// Limite de tamanho do arquivo processado (baixado do storage — não passa pelo body da rota).
export const STATEMENT_IMPORT_MAX_FILE_BYTES = 15 * 1024 * 1024;

// Divergência tolerada entre a soma das linhas extraídas e (saldoFinal - saldoInicial) do extrato.
export const STATEMENT_BALANCE_MISMATCH_TOLERANCE = 0.05;

// Prefixo de path no bucket "files" para os documentos de extrato.
export const STATEMENT_STORAGE_PREFIX = "bank-statements";
