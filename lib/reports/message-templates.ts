import type { OverallSalesStatsResult, PartnerRankingItem, ProductRankingItem, SellerRankingItem } from "./data-fetchers";
import { formatComparisonWithEmoji, formatCurrency, formatNumber, formatPercentage, truncateText } from "./formatters";
import type { TCampaignReportPayload } from "./types";

type ReportMessageInput = {
	orgNome: string;
	periodo: string;
	stats: OverallSalesStatsResult;
	topSellers: SellerRankingItem[];
	topPartners: PartnerRankingItem[];
	topProducts: ProductRankingItem[];
};

function safeCurrency(value: number): string {
	return formatCurrency(Number.isFinite(value) ? value : 0);
}

function safeNumber(value: number): string {
	return formatNumber(Number.isFinite(value) ? value : 0);
}

function filterValidSellers(sellers: SellerRankingItem[]): SellerRankingItem[] {
	return sellers.filter((s) => s.vendedorNome !== "N/A");
}

function filterValidPartners(partners: PartnerRankingItem[]): PartnerRankingItem[] {
	return partners.filter((p) => p.parceiroNome !== "N/A");
}

function formatSellerLines(sellers: SellerRankingItem[], showMeta = false): string {
	if (sellers.length === 0) return "   _Nenhuma venda registrada_";
	return sellers
		.map((s, i) => {
			const metaInfo = showMeta && s.meta > 0 ? ` (${formatPercentage(s.percentualMeta)} da meta)` : "";
			return `   ${i + 1}. ${truncateText(s.vendedorNome, 25)} — ${formatCurrency(s.faturamento)}${metaInfo}`;
		})
		.join("\n");
}

function formatPartnerLines(partners: PartnerRankingItem[], showQty = false): string {
	if (partners.length === 0) return "   _Nenhum parceiro registrado_";
	return partners
		.map((p, i) => {
			const qtyInfo = showQty ? ` (${formatNumber(p.qtdeVendas)} vendas)` : "";
			return `   ${i + 1}. ${truncateText(p.parceiroNome, 25)} — ${formatCurrency(p.faturamento)}${qtyInfo}`;
		})
		.join("\n");
}

function formatProductLines(products: ProductRankingItem[], showQty = false): string {
	if (products.length === 0) return "   _Nenhum produto vendido_";
	return products
		.map((p, i) => {
			const qtyInfo = showQty ? ` (${formatNumber(p.quantidade)} un.)` : "";
			return `   ${i + 1}. ${truncateText(p.produtoNome, 25)} — ${formatCurrency(p.faturamento)}${qtyInfo}`;
		})
		.join("\n");
}

function getCampaignReportLabel(frequency: TCampaignReportPayload["period"]["frequency"]): string {
	if (frequency === "daily") return "IMPACTO DAS CAMPANHAS · DIA";
	if (frequency === "weekly") return "IMPACTO DAS CAMPANHAS · SEMANA";
	if (frequency === "biweekly") return "IMPACTO DAS CAMPANHAS · QUINZENA";
	return "IMPACTO DAS CAMPANHAS · MÊS";
}

export function buildCampaignReportMessage(payload: TCampaignReportPayload): string {
	const { campaign, commercial, period, theme } = payload;
	const comparacao = formatComparisonWithEmoji(campaign.receitaAtribuida.atual, campaign.receitaAtribuida.anterior);

	const tiposLinhas =
		campaign.distribuicaoTipos.length > 0
			? campaign.distribuicaoTipos
					.map((tipo) => `• ${tipo.label}: *${formatNumber(tipo.quantidade)}* (${safeCurrency(tipo.receita)})`)
					.join("\n")
			: "   _Sem conversões classificadas no período_";

	const aceleracaoLinha = campaign.impactoFrequencia.confiavel
		? `• Compras antecipadas: *${formatNumber(campaign.impactoFrequencia.totalAceleradas)}* (${formatNumber(
				Math.round(campaign.impactoFrequencia.diasAntecipadosMedio),
			)} dias antes, em média)`
		: null;
	const ticketLinha =
		campaign.impactoMonetario.totalAcimaTicket > 0
			? `• Compras acima do ticket: *${formatNumber(campaign.impactoMonetario.totalAcimaTicket)}*`
			: null;

	return [
		`🚀 *${getCampaignReportLabel(period.frequency)}*`,
		`📅 ${period.label} · ${theme.orgName}`,
		"─".repeat(30),
		"",
		`💰 *Receita atribuída às campanhas:* ${formatCurrency(campaign.receitaAtribuida.atual)}`,
		`${comparacao} vs. período anterior`,
		"",
		"📣 *Motor de campanhas*",
		`• Mensagens enviadas: *${formatNumber(campaign.mensagensEnviadas.atual)}* para *${formatNumber(campaign.clientesAlcancados)}* clientes`,
		`• Conversões geradas: *${formatNumber(campaign.conversoes.atual)}*`,
		`• Clientes recuperados: *${formatNumber(campaign.clientesRecuperados)}* · Acelerados: *${formatNumber(campaign.clientesAcelerados)}*`,
		`• Ticket médio convertido: *${safeCurrency(campaign.ticketMedioConversao)}*`,
		"",
		"🎯 *Tipos de conversão*",
		tiposLinhas,
		...(aceleracaoLinha || ticketLinha ? ["", "📈 *Qualidade das conversões*", aceleracaoLinha, ticketLinha].filter((line): line is string => line !== null) : []),
		"",
		"🛒 *Resumo comercial*",
		`• Faturamento total: *${safeCurrency(commercial.faturamento.atual)}*`,
		`• Vendas realizadas: *${formatNumber(commercial.qtdeVendas)}*`,
		`• Ticket médio: *${safeCurrency(commercial.ticketMedio)}*`,
		"",
		"_Relatório automático · Recompra CRM_",
	].join("\n");
}

export function buildDailyReportMessage({ orgNome, periodo, stats, topSellers, topPartners, topProducts }: ReportMessageInput): string {
	const comparacao = formatComparisonWithEmoji(stats.faturamento.atual, stats.faturamento.anterior);
	const validSellers = filterValidSellers(topSellers);
	const validPartners = filterValidPartners(topPartners);

	return `📊 *RELATÓRIO DIÁRIO DE VENDAS*
📅 ${periodo} · ${orgNome}
${"─".repeat(30)}

💰 *Faturamento do dia:* ${formatCurrency(stats.faturamento.atual)}
${comparacao} vs. dia anterior
${stats.faturamentoMeta > 0 ? `🎯 *Meta:* ${formatCurrency(stats.faturamentoMeta)} (${formatPercentage(stats.faturamentoMetaPorcentagem)} atingido)` : ""}

📈 *Resumo do Dia*
• Vendas realizadas: *${formatNumber(stats.qtdeVendas.atual)}*
• Ticket médio: *${safeCurrency(stats.ticketMedio.atual)}*
• Itens vendidos: *${safeNumber(stats.qtdeItensVendidos.atual)}*
${validSellers.length > 0 ? `
🏆 *Top Vendedores*
${formatSellerLines(validSellers)}` : ""}
${validPartners.length > 0 ? `
🤝 *Top Parceiros*
${formatPartnerLines(validPartners)}` : ""}

📦 *Top Produtos*
${formatProductLines(topProducts)}

_Relatório automático · Recompra CRM_`;
}

export function buildWeeklyReportMessage({ orgNome, periodo, stats, topSellers, topPartners, topProducts }: ReportMessageInput): string {
	const comparacao = formatComparisonWithEmoji(stats.faturamento.atual, stats.faturamento.anterior);
	const validSellers = filterValidSellers(topSellers);
	const validPartners = filterValidPartners(topPartners);

	return `📊 *RELATÓRIO SEMANAL DE VENDAS*
📅 ${periodo} · ${orgNome}
${"─".repeat(30)}

💰 *Faturamento da semana:* ${formatCurrency(stats.faturamento.atual)}
${comparacao} vs. semana anterior
${stats.faturamentoMeta > 0 ? `🎯 *Meta:* ${formatCurrency(stats.faturamentoMeta)} (${formatPercentage(stats.faturamentoMetaPorcentagem)} atingido)` : ""}

📈 *Indicadores da Semana*
• Total de vendas: *${formatNumber(stats.qtdeVendas.atual)}*
• Ticket médio: *${safeCurrency(stats.ticketMedio.atual)}*
• Itens vendidos: *${safeNumber(stats.qtdeItensVendidos.atual)}*
• Média diária: *${safeCurrency(stats.valorDiarioVendido.atual)}*
${stats.custoTotal.atual > 0 ? `• Margem bruta: *${safeCurrency(stats.margemBruta.atual)}*` : ""}
${validSellers.length > 0 ? `
🏆 *Top Vendedores*
${formatSellerLines(validSellers, true)}` : ""}
${validPartners.length > 0 ? `
🤝 *Top Parceiros*
${formatPartnerLines(validPartners, true)}` : ""}

📦 *Top Produtos*
${formatProductLines(topProducts, true)}

_Relatório automático · Recompra CRM_`;
}

export function buildBiweeklyReportMessage({ orgNome, periodo, stats, topSellers, topPartners, topProducts }: ReportMessageInput): string {
	const comparacao = formatComparisonWithEmoji(stats.faturamento.atual, stats.faturamento.anterior);
	const validSellers = filterValidSellers(topSellers);
	const validPartners = filterValidPartners(topPartners);

	return `📊 *RELATÓRIO QUINZENAL DE VENDAS*
📅 ${periodo} · ${orgNome}
${"─".repeat(30)}

💰 *Faturamento da quinzena:* ${formatCurrency(stats.faturamento.atual)}
${comparacao} vs. quinzena anterior
${stats.faturamentoMeta > 0 ? `🎯 *Meta:* ${formatCurrency(stats.faturamentoMeta)} (${formatPercentage(stats.faturamentoMetaPorcentagem)} atingido)` : ""}

📈 *Indicadores da Quinzena*
• Total de vendas: *${formatNumber(stats.qtdeVendas.atual)}*
• Ticket médio: *${safeCurrency(stats.ticketMedio.atual)}*
• Itens vendidos: *${safeNumber(stats.qtdeItensVendidos.atual)}*
• Média diária: *${safeCurrency(stats.valorDiarioVendido.atual)}*
${stats.custoTotal.atual > 0 ? `• Margem bruta: *${safeCurrency(stats.margemBruta.atual)}*` : ""}
${validSellers.length > 0 ? `
🏆 *Top Vendedores*
${formatSellerLines(validSellers, true)}` : ""}
${validPartners.length > 0 ? `
🤝 *Top Parceiros*
${formatPartnerLines(validPartners, true)}` : ""}

📦 *Top Produtos*
${formatProductLines(topProducts, true)}

_Relatório automático · Recompra CRM_`;
}

export function buildMonthlyReportMessage({ orgNome, periodo, stats, topSellers, topPartners, topProducts }: ReportMessageInput): string {
	const comparacao = formatComparisonWithEmoji(stats.faturamento.atual, stats.faturamento.anterior);
	const validSellers = filterValidSellers(topSellers);
	const validPartners = filterValidPartners(topPartners);

	return `📊 *RELATÓRIO MENSAL DE VENDAS*
📅 ${periodo} · ${orgNome}
${"─".repeat(30)}

💰 *Faturamento do mês:* ${formatCurrency(stats.faturamento.atual)}
${comparacao} vs. mês anterior
${stats.faturamentoMeta > 0 ? `🎯 *Meta:* ${formatCurrency(stats.faturamentoMeta)} (${formatPercentage(stats.faturamentoMetaPorcentagem)} atingido)` : ""}

📈 *Indicadores do Mês*
• Total de vendas: *${formatNumber(stats.qtdeVendas.atual)}*
• Ticket médio: *${safeCurrency(stats.ticketMedio.atual)}*
• Itens vendidos: *${safeNumber(stats.qtdeItensVendidos.atual)}*
• Itens por venda (média): *${safeNumber(stats.itensPorVendaMedio.atual)}*
• Média diária: *${safeCurrency(stats.valorDiarioVendido.atual)}*
${stats.custoTotal.atual > 0 ? `• Margem bruta: *${safeCurrency(stats.margemBruta.atual)}*` : ""}
${validSellers.length > 0 ? `
🏆 *Top Vendedores*
${formatSellerLines(validSellers, true)}` : ""}
${validPartners.length > 0 ? `
🤝 *Top Parceiros*
${formatPartnerLines(validPartners, true)}` : ""}

📦 *Top Produtos*
${formatProductLines(topProducts, true)}

_Relatório automático · Recompra CRM_`;
}
