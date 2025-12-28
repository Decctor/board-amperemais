import { getOverallSalesStats, getPartnerRankings, getProductRankings, getSellerRankings } from "@/lib/reports/data-fetchers";
import { formatComparisonWithEmoji, formatCurrency, formatDate, formatPercentage } from "@/lib/reports/formatters";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import { WHATSAPP_REPORT_TEMPLATES } from "@/lib/whatsapp/templates";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 60,
};

// CONFIGURE AQUI OS NÚMEROS QUE RECEBERÃO OS RELATÓRIOS
// Formato: ["5511999999999", "5511888888888"]
const REPORT_RECIPIENTS = [
	"5534996626855",
	// "5511999999999", // Exemplo: adicione os números aqui
];

const WHATSAPP_PHONE_NUMBER_ID = "893793573806565";

const dailyReportHandler: NextApiHandler = async (req, res) => {
	try {
		console.log("[INFO] [DAILY_REPORT] Starting daily report generation");

		// Validate Vercel Cron secret for security
		const authHeader = req.headers.authorization;
		if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			console.error("[ERROR] [DAILY_REPORT] Unauthorized request");
			return res.status(401).json({ error: "Unauthorized" });
		}

		// if (!WHATSAPP_PHONE_NUMBER_ID) {
		// 	console.error("[ERROR] [DAILY_REPORT] WHATSAPP_PHONE_NUMBER_ID not configured");
		// 	return res.status(500).json({ error: "WhatsApp não configurado" });
		// }

		if (REPORT_RECIPIENTS.length === 0) {
			console.warn("[WARN] [DAILY_REPORT] No recipients configured");
			return res.status(200).json({ message: "No recipients configured", sent: 0 });
		}

		// Buscar todas as organizacoes
		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		console.log(`[INFO] [DAILY_REPORT] Processing ${organizationsList.length} organizations`);

		const allResults = [];

		for (const organization of organizationsList) {
			try {
				console.log(`[ORG: ${organization.id}] [INFO] [DAILY_REPORT] Generating report`);

				// Get data for yesterday (D-1)
				const yesterday = dayjs().subtract(1, "day");
				const periodAfter = yesterday.startOf("day").toDate();
				const periodBefore = yesterday.endOf("day").toDate();

				console.log(`[ORG: ${organization.id}] [INFO] [DAILY_REPORT] Fetching data for period:`, {
					after: periodAfter,
					before: periodBefore,
				});

				// Fetch sales stats
				const stats = await getOverallSalesStats({ after: periodAfter, before: periodBefore, organizacaoId: organization.id });

				// Fetch top sellers, partners, and products
				const topSellers = await getSellerRankings({ after: periodAfter, before: periodBefore, organizacaoId: organization.id }, 3);
				const topPartners = await getPartnerRankings({ after: periodAfter, before: periodBefore, organizacaoId: organization.id }, 3);
				const topProducts = await getProductRankings({ after: periodAfter, before: periodBefore, organizacaoId: organization.id }, 3);

				// Format data for template
				const periodo = formatDate(periodAfter);
				const faturamento = formatCurrency(stats.faturamento.atual);
				const meta = formatCurrency(stats.faturamentoMeta);
				const percentualMeta = formatPercentage(stats.faturamentoMetaPorcentagem);

				const topVendedor1 = topSellers[0]
					? `1. ${topSellers[0].vendedorNome}: ${formatCurrency(topSellers[0].faturamento)}`
					: "1. Nenhuma venda registrada";
				const topVendedor2 = topSellers[1] ? `2. ${topSellers[1].vendedorNome}: ${formatCurrency(topSellers[1].faturamento)}` : "2. -";
				const topVendedor3 = topSellers[2] ? `3. ${topSellers[2].vendedorNome}: ${formatCurrency(topSellers[2].faturamento)}` : "3. -";

				const topParceiro1 = topPartners[0]
					? `1. ${topPartners[0].parceiroNome}: ${formatCurrency(topPartners[0].faturamento)}`
					: "1. Nenhum parceiro registrado";
				const topParceiro2 = topPartners[1] ? `2. ${topPartners[1].parceiroNome}: ${formatCurrency(topPartners[1].faturamento)}` : "2. -";
				const topParceiro3 = topPartners[2] ? `3. ${topPartners[2].parceiroNome}: ${formatCurrency(topPartners[2].faturamento)}` : "3. -";

				const topProduto1 = topProducts[0]
					? `1. ${topProducts[0].produtoDescricao}: ${formatCurrency(topProducts[0].faturamento)}`
					: "1. Nenhum produto vendido";
				const topProduto2 = topProducts[1] ? `2. ${topProducts[1].produtoDescricao}: ${formatCurrency(topProducts[1].faturamento)}` : "2. -";
				const topProduto3 = topProducts[2] ? `3. ${topProducts[2].produtoDescricao}: ${formatCurrency(topProducts[2].faturamento)}` : "3. -";

				const comparacao = formatComparisonWithEmoji(stats.faturamento.atual, stats.faturamento.anterior);

				console.log(`[ORG: ${organization.id}] [INFO] [DAILY_REPORT] Report data prepared:`, {
					periodo,
					faturamento,
					meta,
					percentualMeta,
					comparacao,
				});

				// Send to all recipients
				for (const recipient of REPORT_RECIPIENTS) {
					try {
						console.log(`[ORG: ${organization.id}] [INFO] [DAILY_REPORT] Sending report to ${recipient}`);

						const templatePayload = WHATSAPP_REPORT_TEMPLATES.DAILY_REPORT.getPayload({
							templateKey: "DAILY_REPORT",
							toPhoneNumber: recipient,
							periodo,
							faturamento,
							meta,
							percentualMeta,
							comparacao,
							topVendedor1,
							topVendedor2,
							topVendedor3,
							topParceiro1,
							topParceiro2,
							topParceiro3,
							topProduto1,
							topProduto2,
							topProduto3,
						});

						const result = await sendTemplateWhatsappMessage({
							fromPhoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
							templatePayload: templatePayload.data,
						});

						allResults.push({
							organizationId: organization.id,
							recipient,
							status: "success",
							messageId: result.whatsappMessageId,
						});

						console.log(`[ORG: ${organization.id}] [INFO] [DAILY_REPORT] Successfully sent report to ${recipient}`);
					} catch (error) {
						console.error(`[ORG: ${organization.id}] [ERROR] [DAILY_REPORT] Failed to send report to ${recipient}:`, error);
						allResults.push({
							organizationId: organization.id,
							recipient,
							status: "error",
							error: error instanceof Error ? error.message : "Unknown error",
						});
					}
				}

				console.log(`[ORG: ${organization.id}] [INFO] [DAILY_REPORT] Report completed`);
			} catch (error) {
				console.error(`[ORG: ${organization.id}] [ERROR] [DAILY_REPORT] Error generating report:`, error);
				// Continuar para proxima organizacao mesmo com erro
			}
		}

		const successCount = allResults.filter((r) => r.status === "success").length;
		console.log(`[INFO] [DAILY_REPORT] Reports sent: ${successCount}/${allResults.length} total`);

		return res.status(200).json({
			message: "Daily report completed",
			sent: successCount,
			total: allResults.length,
			results: allResults,
		});
	} catch (error) {
		console.error("[ERROR] [DAILY_REPORT] Fatal error:", error);
		return res.status(500).json({
			error: "Failed to generate daily report",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export default dailyReportHandler;
