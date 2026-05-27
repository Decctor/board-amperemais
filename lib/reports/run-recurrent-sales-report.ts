import {
	buildBiweeklyReportCaption,
	buildDailyReportCaption,
	buildMonthlyReportCaption,
	buildWeeklyReportCaption,
} from "@/lib/reports/caption-templates";
import { buildSalesReportPayload, type TReportOrganization } from "@/lib/reports/payload";
import reportImageRenderer from "@/lib/reports/render-report-image";
import { uploadReportImage } from "@/lib/reports/storage";
import type { TReportFrequency, TSalesReportPayload } from "@/lib/reports/types";
import {
	buildBiweeklyReportMessage,
	buildDailyReportMessage,
	buildMonthlyReportMessage,
	buildWeeklyReportMessage,
} from "@/lib/reports/message-templates";
import { sendMessage } from "@/lib/whatsapp/internal-gateway";
import { formatPhoneForInternalGateway } from "@/lib/whatsapp/utils";
import { db } from "@/services/drizzle";
import type { NextApiRequest, NextApiResponse } from "next";

const INTERNAL_SESSION_ID = process.env.INTERNAL_WHATSAPP_GATEWAY_SESSION_COMS as string;

const { renderReportPng } = reportImageRenderer;

function getReportLogLabel(frequency: TReportFrequency) {
	if (frequency === "daily") return "DAILY_REPORT";
	if (frequency === "weekly") return "WEEKLY_REPORT";
	if (frequency === "biweekly") return "BIWEEKLY_REPORT";
	return "MONTHLY_REPORT";
}

function buildCondensedCaption(payload: TSalesReportPayload) {
	if (payload.period.frequency === "daily") return buildDailyReportCaption(payload);
	if (payload.period.frequency === "weekly") return buildWeeklyReportCaption(payload);
	if (payload.period.frequency === "biweekly") return buildBiweeklyReportCaption(payload);
	return buildMonthlyReportCaption(payload);
}

function buildFallbackText(payload: TSalesReportPayload) {
	if (payload.period.frequency === "daily") {
		return buildDailyReportMessage({
			orgNome: payload.theme.orgName,
			periodo: payload.period.label,
			stats: payload.stats,
			topSellers: payload.topSellers,
			topPartners: payload.topPartners,
			topProducts: payload.topProducts,
		});
	}

	if (payload.period.frequency === "weekly") {
		return buildWeeklyReportMessage({
			orgNome: payload.theme.orgName,
			periodo: payload.period.label,
			stats: payload.stats,
			topSellers: payload.topSellers,
			topPartners: payload.topPartners,
			topProducts: payload.topProducts,
		});
	}

	if (payload.period.frequency === "biweekly") {
		return buildBiweeklyReportMessage({
			orgNome: payload.theme.orgName,
			periodo: payload.period.label,
			stats: payload.stats,
			topSellers: payload.topSellers,
			topPartners: payload.topPartners,
			topProducts: payload.topProducts,
		});
	}

	return buildMonthlyReportMessage({
		orgNome: payload.theme.orgName,
		periodo: payload.period.label,
		stats: payload.stats,
		topSellers: payload.topSellers,
		topPartners: payload.topPartners,
		topProducts: payload.topProducts,
	});
}

async function fetchReportOrganizations() {
	return db.query.organizations.findMany({
		columns: {
			id: true,
			nome: true,
			logoUrl: true,
			corPrimaria: true,
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
			configuracao: true,
		},
		with: {
			membros: {
				columns: {
					id: true,
				},
				with: {
					usuario: {
						columns: {
							id: true,
							telefone: true,
						},
					},
				},
			},
		},
	});
}

type RunRecurrentSalesReportParams = {
	frequency: TReportFrequency;
	req: NextApiRequest;
	res: NextApiResponse;
};

export async function runRecurrentSalesReport({ frequency, req, res }: RunRecurrentSalesReportParams) {
	const logLabel = getReportLogLabel(frequency);

	try {
		console.log(`[INFO] [${logLabel}] Starting recurrent sales report generation`);

		const authHeader = req.headers.authorization;
		if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			console.error(`[ERROR] [${logLabel}] Unauthorized request`);
			return res.status(401).json({ error: "Unauthorized" });
		}

		if (!INTERNAL_SESSION_ID) {
			console.error(`[ERROR] [${logLabel}] INTERNAL_WHATSAPP_GATEWAY_SESSION_COMS not configured`);
			return res.status(500).json({ error: "Sessão WhatsApp interna não configurada" });
		}

		const organizations = await fetchReportOrganizations();
		console.log(`[INFO] [${logLabel}] Processing ${organizations.length} organizations`);

		const allResults: Array<Record<string, unknown>> = [];

		for (const organization of organizations) {
			try {
				const recipientIds = organization.configuracao.preferencias.relatoriosDestinatariosIds ?? [];
				if (recipientIds.length === 0) {
					console.warn(`[ORG: ${organization.id}] [WARN] [${logLabel}] No recipient IDs found, skipping`);
					continue;
				}

				const recipientPhones = organization.membros
					.filter((m) => recipientIds.includes(m.usuario?.id ?? ""))
					.map((m) => m.usuario?.telefone)
					.filter((phone) => !!phone) as string[];
				if (recipientPhones.length === 0) {
					console.warn(`[ORG: ${organization.id}] [WARN] [${logLabel}] No recipient phones found, skipping`);
					continue;
				}

				const payload = await buildSalesReportPayload({
					frequency,
					organization: organization as TReportOrganization,
				});

				if (payload.stats.faturamento.atual === 0) {
					console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] No relevant stats found, skipping`);
					continue;
				}

				const fallbackText = buildFallbackText(payload);
				const caption = buildCondensedCaption(payload);

				console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] Rendering report image`);
				const pngBuffer = await renderReportPng({ payload });
				const { publicUrl, storagePath } = await uploadReportImage({
					organizacaoId: organization.id,
					frequency,
					storageKey: payload.period.storageKey,
					pngBuffer,
				});

				for (const recipientPhone of recipientPhones) {
					const formattedRecipientPhone = formatPhoneForInternalGateway(recipientPhone);

					try {
						console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] Sending image report to ${recipientPhone}`);
						const result = await sendMessage(INTERNAL_SESSION_ID, formattedRecipientPhone, {
							type: "image",
							mediaUrl: publicUrl,
							mediaFileName: `${frequency}-report-${payload.period.storageKey}.png`,
							mediaMimeType: "image/png",
							text: caption,
						});
						allResults.push({
							organizationId: organization.id,
							recipient: formattedRecipientPhone,
							status: "success",
							delivery: "image",
							messageId: result.clientMessageId ?? result.jobId ?? null,
							storagePath,
						});
					} catch (imageError) {
						console.error(
							`[ORG: ${organization.id}] [WARN] [${logLabel}] Image send failed for ${formattedRecipientPhone}, falling back to text:`,
							imageError,
						);

						try {
							const result = await sendMessage(INTERNAL_SESSION_ID, formattedRecipientPhone, {
								type: "text",
								text: fallbackText,
							});

							allResults.push({
								organizationId: organization.id,
								recipient: formattedRecipientPhone,
								status: "success",
								delivery: "text-fallback",
								messageId: result.clientMessageId ?? result.jobId ?? null,
								fallbackReason: imageError instanceof Error ? imageError.message : "Unknown image error",
							});
							console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] Text fallback sent successfully`);
						} catch (fallbackError) {
							console.error(`[ORG: ${organization.id}] [ERROR] [${logLabel}] Text fallback failed:`, fallbackError);
							allResults.push({
								organizationId: organization.id,
								recipient: formattedRecipientPhone,
								status: "error",
								delivery: "failed",
								error: fallbackError instanceof Error ? fallbackError.message : "Unknown error",
								fallbackReason: imageError instanceof Error ? imageError.message : "Unknown image error",
							});
						}
					}
				}
			} catch (error) {
				console.error(`[ORG: ${organization.id}] [ERROR] [${logLabel}] Error generating report:`, error);
			}
		}

		const successCount = allResults.filter((result) => result.status === "success").length;
		console.log(`[INFO] [${logLabel}] Reports sent: ${successCount}/${allResults.length} total`);

		return res.status(200).json({
			message: `${frequency} report completed`,
			sent: successCount,
			total: allResults.length,
			results: allResults,
		});
	} catch (error) {
		console.error(`[ERROR] [${logLabel}] Fatal error:`, error);
		return res.status(500).json({
			error: `Failed to generate ${frequency} report`,
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
}
