import type { TProductPortfolioHealthAlert, TProductPortfolioHealthClassification } from "./types";

export function buildPortfolioHealthScore(alerts: TProductPortfolioHealthAlert[], totalProducts: number, activeProducts: number) {
	if (totalProducts === 0 || activeProducts === 0) {
		return {
			classification: "INSUFICIENTE" as const,
			label: "Dados insuficientes",
			summary: "Não há produtos ou vendas suficientes no período para avaliar a saúde do portfólio.",
		};
	}

	const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
	const warningCount = alerts.filter((alert) => alert.severity === "warning").length;

	if (criticalCount >= 1) {
		return {
			classification: "DESALINHADA" as TProductPortfolioHealthClassification,
			label: "Portfólio em atenção",
			summary: "Detectamos sinais relevantes de concentração, inatividade ou rentabilidade que merecem revisão.",
		};
	}
	if (warningCount >= 2) {
		return {
			classification: "ATENCAO" as const,
			label: "Atenção",
			summary: "O portfólio apresenta pontos de atenção em vitalidade, concentração ou margem.",
		};
	}
	if (warningCount === 1) {
		return {
			classification: "ATENCAO" as const,
			label: "Atenção",
			summary: "Um ponto de atenção foi identificado. Vale conferir o detalhe antes de decisões automatizadas.",
		};
	}
	return {
		classification: "SAUDAVEL" as const,
		label: "Saudável",
		summary: "O portfólio parece equilibrado em concentração, vitalidade e margem no período analisado.",
	};
}
