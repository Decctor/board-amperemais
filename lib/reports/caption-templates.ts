import type { TCampaignReportPayload, TSalesReportPayload } from "./types";
import { formatComparisonWithEmoji, formatCurrency, formatNumber, formatPercentage } from "./formatters";

function safeNumber(value: number) {
	return Number.isFinite(value) ? value : 0;
}

function getReportTitle(frequency: TSalesReportPayload["period"]["frequency"]) {
	if (frequency === "daily") return "RELATÓRIO DIÁRIO DE VENDAS";
	if (frequency === "weekly") return "RELATÓRIO SEMANAL DE VENDAS";
	if (frequency === "biweekly") return "RELATÓRIO QUINZENAL DE VENDAS";
	return "RELATÓRIO MENSAL DE VENDAS";
}

function getRevenueLabel(frequency: TSalesReportPayload["period"]["frequency"]) {
	if (frequency === "daily") return "Faturamento do dia";
	if (frequency === "weekly") return "Faturamento da semana";
	if (frequency === "biweekly") return "Faturamento da quinzena";
	return "Faturamento do mês";
}

function getSummaryLabel(frequency: TSalesReportPayload["period"]["frequency"]) {
	if (frequency === "daily") return "Resumo do Dia";
	if (frequency === "weekly") return "Resumo da Semana";
	if (frequency === "biweekly") return "Resumo da Quinzena";
	return "Resumo do Mês";
}

function getComparisonText(current: number, previous: number | undefined, frequency: TSalesReportPayload["period"]["frequency"]) {
	const baseLabel =
		frequency === "daily" ? "dia anterior" : frequency === "weekly" ? "semana anterior" : frequency === "biweekly" ? "quinzena anterior" : "mês anterior";
	return `${formatComparisonWithEmoji(current, previous)} vs. ${baseLabel}`;
}

function getHighlight(payload: TSalesReportPayload) {
	const bestSeller = payload.topSellers.find((seller) => seller.vendedorNome !== "N/A");
	if (bestSeller) {
		return `🏆 *Destaque:* ${bestSeller.vendedorNome} liderou com *${formatCurrency(bestSeller.faturamento)}*`;
	}

	const bestProduct = payload.topProducts[0];
	if (bestProduct) {
		return `🏆 *Destaque:* ${bestProduct.produtoNome} gerou *${formatCurrency(bestProduct.faturamento)}*`;
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

	if (payload.period.frequency === "biweekly") {
		return `• Itens vendidos: *${formatNumber(safeNumber(payload.stats.qtdeItensVendidos.atual))}*`;
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

function getCampaignReportTitle(frequency: TCampaignReportPayload["period"]["frequency"]) {
	if (frequency === "daily") return "IMPACTO DAS CAMPANHAS · DIA";
	if (frequency === "weekly") return "IMPACTO DAS CAMPANHAS · SEMANA";
	if (frequency === "biweekly") return "IMPACTO DAS CAMPANHAS · QUINZENA";
	return "IMPACTO DAS CAMPANHAS · MÊS";
}

export function buildCampaignReportCaption(payload: TCampaignReportPayload) {
	const { campaign, commercial, period, theme } = payload;
	const comparison = `${formatComparisonWithEmoji(campaign.receitaAtribuida.atual, campaign.receitaAtribuida.anterior)} vs. período anterior`;

	return [
		`🚀 *${getCampaignReportTitle(period.frequency)}*`,
		`📅 ${period.label} · ${theme.orgName}`,
		"────────────────────",
		`💰 *Receita atribuída:* ${formatCurrency(campaign.receitaAtribuida.atual)}`,
		comparison,
		"",
		"📣 *Motor de campanhas*",
		`• Mensagens enviadas: *${formatNumber(campaign.mensagensEnviadas.atual)}* para *${formatNumber(campaign.clientesAlcancados)}* clientes`,
		`• Conversões geradas: *${formatNumber(campaign.conversoes.atual)}*`,
		`• Clientes recuperados: *${formatNumber(campaign.clientesRecuperados)}* · Acelerados: *${formatNumber(campaign.clientesAcelerados)}*`,
		"",
		`🛒 *Faturamento total:* ${formatCurrency(commercial.faturamento.atual)} · ${formatNumber(commercial.qtdeVendas)} vendas`,
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

export function buildBiweeklyReportCaption(payload: TSalesReportPayload) {
	return buildCaption(payload);
}

export function buildMonthlyReportCaption(payload: TSalesReportPayload) {
	return buildCaption(payload);
}
