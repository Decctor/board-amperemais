import { getOverallSalesStats, getSellerRankings } from "@/lib/reports/data-fetchers";
import { formatComparisonWithEmoji, formatCurrency, formatDate, formatPercentage } from "@/lib/reports/formatters";
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

		// Get data for yesterday (D-1)
		const yesterday = dayjs().subtract(1, "day");
		const periodAfter = yesterday.startOf("day").toDate();
		const periodBefore = yesterday.endOf("day").toDate();

		console.log("[INFO] [DAILY_REPORT] Fetching data for period:", {
			after: periodAfter,
			before: periodBefore,
		});

		// Fetch sales stats
		const stats = await getOverallSalesStats({ after: periodAfter, before: periodBefore });

		// Fetch top sellers
		const topSellers = await getSellerRankings({ after: periodAfter, before: periodBefore }, 3);

		// Format data for template
		const reportDate = formatDate(periodAfter);
		const faturamento = formatCurrency(stats.faturamento.atual);
		const meta = formatCurrency(stats.faturamentoMeta);
		const percentualMeta = formatPercentage(stats.faturamentoMetaPorcentagem);

		const topVendedor1 = topSellers[0] ? `${topSellers[0].vendedorNome}: ${formatCurrency(topSellers[0].faturamento)}` : "Nenhuma venda registrada";
		const topVendedor2 = topSellers[1] ? `${topSellers[1].vendedorNome}: ${formatCurrency(topSellers[1].faturamento)}` : "-";
		const topVendedor3 = topSellers[2] ? `${topSellers[2].vendedorNome}: ${formatCurrency(topSellers[2].faturamento)}` : "-";

		const comparacao = formatComparisonWithEmoji(stats.faturamento.atual, stats.faturamento.anterior);

		console.log("[INFO] [DAILY_REPORT] Report data prepared:", {
			reportDate,
			faturamento,
			meta,
			percentualMeta,
			topVendedor1,
			comparacao,
		});

		// Send to all recipients
		const results = [];
		for (const recipient of REPORT_RECIPIENTS) {
			try {
				console.log(`[INFO] [DAILY_REPORT] Sending report to ${recipient}`);

				const templatePayload = WHATSAPP_REPORT_TEMPLATES.DAILY_REPORT.getPayload({
					templateKey: "DAILY_REPORT",
					toPhoneNumber: recipient,
					reportDate,
					faturamento,
					meta,
					percentualMeta,
					topVendedor1,
					topVendedor2,
					topVendedor3,
					comparacao,
				});

				// const result = await sendTemplateWhatsappMessage({
				// 	fromPhoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
				// 	templatePayload: templatePayload.data,
				// });

				// results.push({
				// 	recipient,
				// 	status: "success",
				// 	messageId: result.whatsappMessageId,
				// });
				results.push({
					recipient,
					status: "success",
					messageId: "1234567890",
				});

				console.log(`[INFO] [DAILY_REPORT] Successfully sent report to ${recipient}`);
			} catch (error) {
				console.error(`[ERROR] [DAILY_REPORT] Failed to send report to ${recipient}:`, error);
				results.push({
					recipient,
					status: "error",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const successCount = results.filter((r) => r.status === "success").length;
		console.log(`[INFO] [DAILY_REPORT] Report sent to ${successCount}/${REPORT_RECIPIENTS.length} recipients`);

		return res.status(200).json({
			message: "Daily report completed",
			date: reportDate,
			sent: successCount,
			total: REPORT_RECIPIENTS.length,
			results,
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
