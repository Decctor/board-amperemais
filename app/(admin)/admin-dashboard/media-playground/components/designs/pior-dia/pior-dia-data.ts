// ── Segmentos selecionados (etapa 1) ───────────────────────────
export const PIOR_DIA_SEGMENTS = [
	{ label: "LEAIS", color: "#A78BFA", bg: "rgba(167,139,250,0.18)", border: "rgba(167,139,250,0.40)" },
	{ label: "CAMPEÕES", color: "#FFCD2E", bg: "rgba(255,205,46,0.18)", border: "rgba(255,205,46,0.40)" },
] as const;

// ── Disparo (etapa 2) ──────────────────────────────────────────
export const PIOR_DIA_TRIGGER_RECIPIENTS_TOTAL = 200;
export const PIOR_DIA_TRIGGER_RECIPIENTS_SENT = 134;
export const PIOR_DIA_TRIGGER_TIME_LABEL = "TERÇA, 20:30";
export const PIOR_DIA_TRIGGER_PROGRESS_LABEL = "ENVIANDO PARA 200 CLIENTES";

// ── Conversão (etapa 3) ────────────────────────────────────────
export const PIOR_DIA_REVENUE_BEFORE = "R$ 1.240";
export const PIOR_DIA_REVENUE_AFTER = "R$ 3.870";
export const PIOR_DIA_REVENUE_DELTA = "+212%";

/**
 * Pontos da curva de receita ANTES (4 semanas) — quartas “fracas”.
 * Valores normalizados 0..100 para o mini-chart.
 */
export const PIOR_DIA_REVENUE_TREND_BEFORE = [22, 18, 24, 19] as const;

/**
 * Pontos da curva de receita DEPOIS — começa baixo e dispara
 * conforme a campanha entra em ação.
 */
export const PIOR_DIA_REVENUE_TREND_AFTER = [22, 36, 58, 88] as const;
