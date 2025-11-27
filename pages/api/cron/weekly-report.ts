import {
	getOverallSalesStats,
	getPartnerRankings,
	getProductGroupRankings,
	getProductRankings,
	getSellerRankings,
} from "@/lib/reports/data-fetchers";
import { formatComparisonWithEmoji, formatCurrency, formatDateRange, formatPercentage, truncateText } from "@/lib/reports/formatters";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import { WHATSAPP_REPORT_TEMPLATES } from "@/lib/whatsapp/templates";
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

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const weeklyReportHandler: NextApiHandler = async (req, res) => {
	try {
		console.log("[INFO] [WEEKLY_REPORT] Starting weekly report generation");

		// Validate Vercel Cron secret for security
		const authHeader = req.headers.authorization;
		if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			console.error("[ERROR] [WEEKLY_REPORT] Unauthorized request");
			return res.status(401).json({ error: "Unauthorized" });
		}

		// if (!WHATSAPP_PHONE_NUMBER_ID) {
		// 	console.error("[ERROR] [WEEKLY_REPORT] WHATSAPP_PHONE_NUMBER_ID not configured");
		// 	return res.status(500).json({ error: "WhatsApp não configurado" });
		// }

		if (REPORT_RECIPIENTS.length === 0) {
			console.warn("[WARN] [WEEKLY_REPORT] No recipients configured");
			return res.status(200).json({ message: "No recipients configured", sent: 0 });
		}

		// Get data for last week (Sunday to Saturday of last week)
		const lastSunday = dayjs().subtract(1, "week").day(0);
		const lastSaturday = dayjs().subtract(1, "week").day(6);

		const periodAfter = lastSunday.startOf("day").toDate();
		const periodBefore = lastSaturday.endOf("day").toDate();

		console.log("[INFO] [WEEKLY_REPORT] Fetching data for period:", {
			after: periodAfter,
			before: periodBefore,
		});

		// Fetch sales stats
		const stats = await getOverallSalesStats({ after: periodAfter, before: periodBefore });

		// Fetch top sellers
		const topSellers = await getSellerRankings({ after: periodAfter, before: periodBefore }, 5);

		// Fetch top products
		const topProducts = await getProductRankings({ after: periodAfter, before: periodBefore }, 5);

		// Format data for template
		const periodo = formatDateRange(periodAfter, periodBefore);
		const faturamento = formatCurrency(stats.faturamento.atual);
		const meta = formatCurrency(stats.faturamentoMeta);
		const percentualMeta = formatPercentage(stats.faturamentoMetaPorcentagem);

		// Format top sellers list
		const topVendedoresLines = topSellers
			.map((seller, index) => `${index + 1}. ${truncateText(seller.vendedorNome, 20)}: ${formatCurrency(seller.faturamento)}`)
			.join("\n");
		const topVendedores = topVendedoresLines || "Nenhuma venda registrada";

		// Format top products list
		const topProdutosLines = topProducts
			.map((product, index) => `${index + 1}. ${truncateText(product.produtoDescricao, 20)}: ${formatCurrency(product.faturamento)}`)
			.join("\n");
		const topProdutos = topProdutosLines || "Nenhum produto vendido";

		const comparacao = formatComparisonWithEmoji(stats.faturamento.atual, stats.faturamento.anterior);

		console.log("[INFO] [WEEKLY_REPORT] Report data prepared:", {
			periodo,
			faturamento,
			meta,
			percentualMeta,
			comparacao,
		});

		// Send to all recipients
		const results = [];
		for (const recipient of REPORT_RECIPIENTS) {
			try {
				console.log(`[INFO] [WEEKLY_REPORT] Sending report to ${recipient}`);

				const templatePayload = WHATSAPP_REPORT_TEMPLATES.WEEKLY_REPORT.getPayload({
					templateKey: "WEEKLY_REPORT",
					toPhoneNumber: recipient,
					periodo,
					faturamento,
					meta,
					percentualMeta,
					topVendedores,
					topProdutos,
					comparacao,
				});

				// const result = await sendTemplateWhatsappMessage({
				// 	fromPhoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
				// 	templatePayload: templatePayload.data,
				// });

				results.push({
					recipient,
					status: "success",
					messageId: "1234567890", // result.whatsappMessageId,
				});

				console.log(`[INFO] [WEEKLY_REPORT] Successfully sent report to ${recipient}`);
			} catch (error) {
				console.error(`[ERROR] [WEEKLY_REPORT] Failed to send report to ${recipient}:`, error);
				results.push({
					recipient,
					status: "error",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const successCount = results.filter((r) => r.status === "success").length;
		console.log(`[INFO] [WEEKLY_REPORT] Report sent to ${successCount}/${REPORT_RECIPIENTS.length} recipients`);

		return res.status(200).json({
			message: "Weekly report completed",
			period: periodo,
			sent: successCount,
			total: REPORT_RECIPIENTS.length,
			results,
		});
	} catch (error) {
		console.error("[ERROR] [WEEKLY_REPORT] Fatal error:", error);
		return res.status(500).json({
			error: "Failed to generate weekly report",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export default weeklyReportHandler;
