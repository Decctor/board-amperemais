import type { TSalesReportPayload } from "./types";
import { formatComparisonWithEmoji, formatCurrency, formatNumber, formatPercentage } from "./formatters";

function safeNumber(value: number) {
	return Number.isFinite(value) ? value : 0;
}

function getReportTitle(frequency: TSalesReportPayload["period"]["frequency"]) {
	if (frequency === "daily") return "RELATÓRIO DIÁRIO DE VENDAS";
	if (frequency === "weekly") return "RELATÓRIO SEMANAL DE VENDAS";
	return "RELATÓRIO MENSAL DE VENDAS";
}

function getRevenueLabel(frequency: TSalesReportPayload["period"]["frequency"]) {
	if (frequency === "daily") return "Faturamento do dia";
	if (frequency === "weekly") return "Faturamento da semana";
	return "Faturamento do mês";
}

function getSummaryLabel(frequency: TSalesReportPayload["period"]["frequency"]) {
	if (frequency === "daily") return "Resumo do Dia";
	if (frequency === "weekly") return "Resumo da Semana";
	return "Resumo do Mês";
}

function getComparisonText(current: number, previous: number | undefined, frequency: TSalesReportPayload["period"]["frequency"]) {
	const baseLabel = frequency === "daily" ? "dia anterior" : frequency === "weekly" ? "semana anterior" : "mês anterior";
	return `${formatComparisonWithEmoji(current, previous)} vs. ${baseLabel}`;
}

function getHighlight(payload: TSalesReportPayload) {
	const bestSeller = payload.topSellers.find((seller) => seller.vendedorNome !== "N/A");
	if (bestSeller) {
		return `🏆 *Destaque:* ${bestSeller.vendedorNome} liderou com *${formatCurrency(bestSeller.faturamento)}*`;
	}

	const bestProduct = payload.topProducts[0];
	if (bestProduct) {
		return `🏆 *Destaque:* ${bestProduct.produtoDescricao} gerou *${formatCurrency(bestProduct.faturamento)}*`;
	}

	return "🏆 *Destaque:* Sem item líder no período";
}

function getThirdSummaryLine(payload: TSalesReportPayload) {
	if (payload.period.frequency === "daily") {
		return `• Itens vendidos: *${formatNumber(safeNumber(payload.stats.qtdeItensVendidos.atual))}*`;
	}

	if (payload.period.frequency === "weekly") {
		return `• Média diária: *${formatCurrency(safeNumber(payload.stats.valorDiarioVendido.atual))}*`;
	}

	return `• Itens por venda: *${formatNumber(safeNumber(payload.stats.itensPorVendaMedio.atual))}*`;
}

function buildCaption(payload: TSalesReportPayload) {
	const comparison = getComparisonText(payload.stats.faturamento.atual, payload.stats.faturamento.anterior, payload.period.frequency);
	const goalLine =
		payload.stats.faturamentoMeta > 0
			? `🎯 *Meta:* ${formatCurrency(payload.stats.faturamentoMeta)} (${formatPercentage(payload.stats.faturamentoMetaPorcentagem)} atingido)`
			: null;

	return [
		`📊 *${getReportTitle(payload.period.frequency)}*`,
		`📅 ${payload.period.label} · ${payload.theme.orgName}`,
		"────────────────────",
		`💰 *${getRevenueLabel(payload.period.frequency)}:* ${formatCurrency(payload.stats.faturamento.atual)}`,
		comparison,
		goalLine,
		"",
		`📈 *${getSummaryLabel(payload.period.frequency)}*`,
		`• Vendas realizadas: *${formatNumber(payload.stats.qtdeVendas.atual)}*`,
		`• Ticket médio: *${formatCurrency(safeNumber(payload.stats.ticketMedio.atual))}*`,
		getThirdSummaryLine(payload),
		"",
		getHighlight(payload),
		"",
		"_Relatório automático · Recompra CRM_",
	]
		.filter((line) => line !== null)
		.join("\n");
}

export function buildDailyReportCaption(payload: TSalesReportPayload) {
	return buildCaption(payload);
}

export function buildWeeklyReportCaption(payload: TSalesReportPayload) {
	return buildCaption(payload);
}

export function buildMonthlyReportCaption(payload: TSalesReportPayload) {
	return buildCaption(payload);
}
