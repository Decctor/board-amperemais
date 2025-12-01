import {
	getOverallSalesStats,
	getPartnerRankings,
	getProductGroupRankings,
	getProductRankings,
	getSellerRankings,
} from "@/lib/reports/data-fetchers";
import { formatComparisonWithEmoji, formatCurrency, formatNumber, formatPercentage, truncateText } from "@/lib/reports/formatters";
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

const monthlyReportHandler: NextApiHandler = async (req, res) => {
	try {
		console.log("[INFO] [MONTHLY_REPORT] Starting monthly report generation");

		// Validate Vercel Cron secret for security
		const authHeader = req.headers.authorization;
		if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			console.error("[ERROR] [MONTHLY_REPORT] Unauthorized request");
			return res.status(401).json({ error: "Unauthorized" });
		}

		// if (!WHATSAPP_PHONE_NUMBER_ID) {
		// 	console.error("[ERROR] [MONTHLY_REPORT] WHATSAPP_PHONE_NUMBER_ID not configured");
		// 	return res.status(500).json({ error: "WhatsApp não configurado" });
		// }

		if (REPORT_RECIPIENTS.length === 0) {
			console.warn("[WARN] [MONTHLY_REPORT] No recipients configured");
			return res.status(200).json({ message: "No recipients configured", sent: 0 });
		}

		// Get data for last month (full month)
		const lastMonth = dayjs().subtract(1, "month");
		const periodAfter = lastMonth.startOf("month").toDate();
		const periodBefore = lastMonth.endOf("month").toDate();

		console.log("[INFO] [MONTHLY_REPORT] Fetching data for period:", {
			after: periodAfter,
			before: periodBefore,
		});

		// Fetch sales stats
		const stats = await getOverallSalesStats({ after: periodAfter, before: periodBefore });

		// Fetch top sellers
		const topSellers = await getSellerRankings({ after: periodAfter, before: periodBefore }, 5);

		// Fetch top products
		const topProducts = await getProductRankings({ after: periodAfter, before: periodBefore }, 5);

		// Fetch top partners
		const topPartners = await getPartnerRankings({ after: periodAfter, before: periodBefore }, 5);

		// Format data for template
		const periodo = dayjs(periodAfter).format("MMMM/YYYY").toUpperCase();
		const faturamento = formatCurrency(stats.faturamento.atual);
		const meta = formatCurrency(stats.faturamentoMeta);
		const percentualMeta = formatPercentage(stats.faturamentoMetaPorcentagem);

		// Format additional details
		const ticketMedio = formatCurrency(stats.ticketMedio.atual);
		const qtdeVendas = formatNumber(stats.qtdeVendas.atual);
		const margemBruta = formatCurrency(stats.margemBruta.atual);
		const detalhes = `Vendas: ${qtdeVendas} | Ticket Médio: ${ticketMedio} | Margem Bruta: ${margemBruta}`;

		// Format top sellers list
		const topVendedoresLines = topSellers
			.map(
				(seller, index) =>
					`${index + 1}. ${truncateText(seller.vendedorNome, 15)}: ${formatCurrency(seller.faturamento)} (${formatPercentage(seller.percentualMeta)} da meta)`,
			)
			.join("\n");
		const topVendedores = topVendedoresLines || "Nenhuma venda registrada";

		// Format top products list
		const topProdutosLines = topProducts
			.map((product, index) => `${index + 1}. ${truncateText(product.produtoDescricao, 20)}: ${formatCurrency(product.faturamento)}`)
			.join("\n");
		const topProdutos = topProdutosLines || "Nenhum produto vendido";

		// Format top partners list
		const topParceirosLines = topPartners
			.map((partner, index) => `${index + 1}. ${truncateText(partner.parceiroNome, 20)}: ${formatCurrency(partner.faturamento)}`)
			.join("\n");
		const topParceiros = topParceirosLines || "Nenhum parceiro registrado";

		const comparacao = formatComparisonWithEmoji(stats.faturamento.atual, stats.faturamento.anterior);

		console.log("[INFO] [MONTHLY_REPORT] Report data prepared:", {
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
				console.log(`[INFO] [MONTHLY_REPORT] Sending report to ${recipient}`);

				const templatePayload = WHATSAPP_REPORT_TEMPLATES.MONTHLY_REPORT.getPayload({
					templateKey: "MONTHLY_REPORT",
					toPhoneNumber: recipient,
					periodo,
					faturamento,
					meta,
					percentualMeta,
					detalhes,
					topVendedores,
					topProdutos,
					topParceiros,
					comparacao,
				});

				const result = await sendTemplateWhatsappMessage({
					fromPhoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
					templatePayload: templatePayload.data,
				});

				results.push({
					recipient,
					status: "success",
					messageId: result.whatsappMessageId,
				});

				console.log(`[INFO] [MONTHLY_REPORT] Successfully sent report to ${recipient}`);
			} catch (error) {
				console.error(`[ERROR] [MONTHLY_REPORT] Failed to send report to ${recipient}:`, error);
				results.push({
					recipient,
					status: "error",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const successCount = results.filter((r) => r.status === "success").length;
		console.log(`[INFO] [MONTHLY_REPORT] Report sent to ${successCount}/${REPORT_RECIPIENTS.length} recipients`);

		return res.status(200).json({
			message: "Monthly report completed",
			period: periodo,
			sent: successCount,
			total: REPORT_RECIPIENTS.length,
			results,
		});
	} catch (error) {
		console.error("[ERROR] [MONTHLY_REPORT] Fatal error:", error);
		return res.status(500).json({
			error: "Failed to generate monthly report",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export default monthlyReportHandler;
