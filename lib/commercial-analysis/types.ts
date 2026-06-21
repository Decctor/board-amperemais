// Camada de análise comercial determinística usada pelo agente de marketing.
// Toda métrica retorna o tamanho da amostra e um grau de confiança para que o
// agente saiba quando NÃO confiar no número (cenário de dado imperfeito).

export type TAnalysisConfidence = "ALTA" | "MODERADA" | "BAIXA" | "INSUFICIENTE";

export type TAnalysisSufficiency = {
	amostra: number;
	confianca: TAnalysisConfidence;
	observacao: string | null;
};

// Limiares de amostra:
// - 100+  => ALTA (base suficiente para inferência estável)
// - 30+   => MODERADA (direcional; evite decisões finas)
// - 1+    => BAIXA (apenas indício, sujeito a ruído)
// - 0     => INSUFICIENTE (não use o número)
// Referência: ~384 observações dão margem de ±5% a 95% de confiança em
// proporções; abaixo de 30 não há base para inferência estável.
export const SAMPLE_THRESHOLDS = {
	moderada: 30,
	alta: 100,
} as const;

export function buildSufficiency(sampleSize: number, observacao: string | null = null): TAnalysisSufficiency {
	const confianca: TAnalysisConfidence =
		sampleSize >= SAMPLE_THRESHOLDS.alta
			? "ALTA"
			: sampleSize >= SAMPLE_THRESHOLDS.moderada
				? "MODERADA"
				: sampleSize > 0
					? "BAIXA"
					: "INSUFICIENTE";

	return { amostra: sampleSize, confianca, observacao };
}
