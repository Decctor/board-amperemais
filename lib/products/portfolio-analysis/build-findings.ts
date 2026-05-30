import type { TMetricSummary } from "@/utils/analytics";
import type { TAbcDistributionItem, TProductPortfolioAnalysisFinding, TProductWithPeriodMetrics } from "./types";

type TBuildFindingsInput = {
	totalProducts: number;
	activeProducts: TProductWithPeriodMetrics[];
	abcDistribution: TAbcDistributionItem[];
	revenueMetrics: TMetricSummary;
	marginMetrics: TMetricSummary;
};

export function buildPortfolioAnalysisFindings({
	totalProducts,
	activeProducts,
	abcDistribution,
	revenueMetrics,
	marginMetrics,
}: TBuildFindingsInput): TProductPortfolioAnalysisFinding[] {
	const findings: TProductPortfolioAnalysisFinding[] = [];
	const activeCount = activeProducts.length;

	if (totalProducts === 0) {
		findings.push({
			id: "no-products",
			severity: "warning",
			title: "Catálogo vazio.",
			description: "Não há produtos cadastrados para analisar. Cadastre ou sincronize produtos e tente novamente.",
		});
		return findings;
	}

	if (activeCount === 0) {
		findings.push({
			id: "no-active-products",
			severity: "warning",
			title: "Nenhum produto vendeu no período.",
			description: "Não foram encontradas vendas de produtos no intervalo selecionado. Amplie o período ou verifique a sincronização de vendas.",
		});
		return findings;
	}

	const dormantCount = totalProducts - activeCount;
	const dormantShare = totalProducts > 0 ? (dormantCount / totalProducts) * 100 : 0;
	if (dormantShare >= 60) {
		findings.push({
			id: "dormant-critico",
			severity: "critical",
			title: `${dormantShare.toFixed(1)}% do catálogo não vendeu no período.`,
			description: "Mais da metade dos produtos cadastrados ficou sem movimento. Vale revisar itens obsoletos ou oportunidades de reativação.",
		});
	} else if (dormantShare >= 40) {
		findings.push({
			id: "dormant-alerta",
			severity: "warning",
			title: `${dormantShare.toFixed(1)}% do catálogo não vendeu no período.`,
			description: "Parcela relevante do catálogo está dormante. Considere campanhas focadas ou limpeza de SKUs sem demanda.",
		});
	}

	const classA = abcDistribution.find((item) => item.label === "A");
	const classASkuShare = classA?.percentage ?? 0;
	const classARevenueShare = classA?.revenueShare ?? 0;
	if (classASkuShare > 0 && classASkuShare <= 10 && classARevenueShare >= 70) {
		findings.push({
			id: "concentracao-extrema",
			severity: "critical",
			title: "Concentração extrema de faturamento.",
			description: `Apenas ${classASkuShare.toFixed(1)}% dos produtos ativos (classe A) concentram ${classARevenueShare.toFixed(1)}% do faturamento. Há forte dependência de poucos SKUs.`,
		});
	} else if (classASkuShare > 0 && classASkuShare <= 20 && classARevenueShare >= 80) {
		findings.push({
			id: "concentracao-alta",
			severity: "warning",
			title: "Concentração elevada de faturamento.",
			description: `${classARevenueShare.toFixed(1)}% do faturamento vem de ${classASkuShare.toFixed(1)}% dos produtos ativos. Monitore riscos de ruptura ou sazonalidade nesses itens.`,
		});
	}

	const negativeMarginCount = activeProducts.filter((product) => product.revenue > 0 && product.marginPercentage < 0).length;
	const negativeMarginShare = activeCount > 0 ? (negativeMarginCount / activeCount) * 100 : 0;
	if (negativeMarginShare >= 10) {
		findings.push({
			id: "margem-negativa-critica",
			severity: "critical",
			title: `${negativeMarginShare.toFixed(1)}% dos produtos ativos têm margem negativa.`,
			description: `${negativeMarginCount} produtos venderam abaixo do custo no período. Revise precificação ou composição de custos.`,
		});
	} else if (negativeMarginCount > 0) {
		findings.push({
			id: "margem-negativa",
			severity: "warning",
			title: `${negativeMarginCount} ${negativeMarginCount === 1 ? "produto ativo tem" : "produtos ativos têm"} margem negativa.`,
			description: "Existem vendas com preço abaixo do custo. Vale investigar os itens afetados.",
		});
	}

	const revenueAvg = revenueMetrics.average ?? 0;
	const revenueMedian = revenueMetrics.median ?? 0;
	if (revenueMedian > 0 && revenueAvg > revenueMedian * 3) {
		findings.push({
			id: "revenue-assimetria",
			severity: "info",
			title: "Distribuição de faturamento assimétrica.",
			description: "A média de faturamento por produto é muito superior à mediana, indicando poucos SKUs com vendas desproporcionais.",
		});
	}

	const marginAvg = marginMetrics.average ?? 0;
	const marginMedian = marginMetrics.median ?? 0;
	if (marginMedian > 0 && marginAvg > marginMedian * 2) {
		findings.push({
			id: "margem-assimetria",
			severity: "info",
			title: "Distribuição de margem assimétrica.",
			description: "A margem média está bem acima da mediana. Alguns produtos de alta margem puxam a média do portfólio.",
		});
	}

	const classC = abcDistribution.find((item) => item.label === "C");
	if ((classC?.percentage ?? 0) >= 70 && activeCount > 20) {
		findings.push({
			id: "cauda-longa",
			severity: "info",
			title: "Cauda longa no portfólio.",
			description: `${(classC?.percentage ?? 0).toFixed(1)}% dos produtos ativos estão na classe C. É comum em catálogos amplos, mas indica muitos itens de baixo impacto.`,
		});
	}

	return findings;
}
