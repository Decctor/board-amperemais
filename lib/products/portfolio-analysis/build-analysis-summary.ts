import type { TProductPortfolioAnalysisClassification, TProductPortfolioAnalysisFinding } from "./types";

export function buildPortfolioAnalysisSummary(findings: TProductPortfolioAnalysisFinding[], totalProducts: number, activeProducts: number) {
	if (totalProducts === 0 || activeProducts === 0) {
		return {
			classification: "INSUFICIENTE" as const,
			label: "Dados insuficientes",
			summary: "Não há produtos ou vendas suficientes no período para gerar a análise.",
		};
	}

	const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
	const warningCount = findings.filter((finding) => finding.severity === "warning").length;

	if (criticalCount >= 1) {
		return {
			classification: "CONCENTRADO" as TProductPortfolioAnalysisClassification,
			label: "Concentração relevante",
			summary: "A análise encontrou concentração, inatividade ou rentabilidade fora do padrão esperado.",
		};
	}
	if (warningCount >= 2) {
		return {
			classification: "ATENCAO" as const,
			label: "Pontos de atenção",
			summary: "O portfólio apresenta variações relevantes em atividade, concentração ou margem.",
		};
	}
	if (warningCount === 1) {
		return {
			classification: "ATENCAO" as const,
			label: "Ponto de atenção",
			summary: "Um ponto estatístico merece leitura antes de decisões automatizadas.",
		};
	}
	return {
		classification: "EQUILIBRADO" as const,
		label: "Distribuição equilibrada",
		summary: "O portfólio apresenta distribuição consistente em concentração, atividade e margem no período.",
	};
}
