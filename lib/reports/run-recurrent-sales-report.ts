import { buildCampaignReportPayload, type TReportOrganization } from "@/lib/reports/payload";
import reportImageRenderer from "@/lib/reports/render-report-image";
import { uploadReportImage } from "@/lib/reports/storage";
import type { TCampaignReportPayload, TReportFrequency } from "@/lib/reports/types";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import type { TemplatePayload } from "@/lib/whatsapp/templates";
import { formatPhoneForInternalGateway, sanitizeTemplateParameter } from "@/lib/whatsapp/utils";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";

const REPORT_TEMPLATE_NAME = "recompracrm_relatorio_recorrente";
const REPORT_TEMPLATE_LANGUAGE = "pt_BR";

const { renderCampaignReportPng } = reportImageRenderer;

function getReportLogLabel(frequency: TReportFrequency) {
	if (frequency === "daily") return "DAILY_REPORT";
	if (frequency === "weekly") return "WEEKLY_REPORT";
	if (frequency === "biweekly") return "BIWEEKLY_REPORT";
	return "MONTHLY_REPORT";
}

function getReportFrequencyLabel(frequency: TReportFrequency) {
	if (frequency === "daily") return "diário";
	if (frequency === "weekly") return "semanal";
	if (frequency === "biweekly") return "quinzenal";
	return "mensal";
}

function getRecipientTemplateName(name: string) {
	return name.trim().split(/\s+/)[0] || "pessoal";
}

/** Skip orgs with no meaningful activity in the period to avoid sending an empty report. */
function shouldSkipReport(payload: TCampaignReportPayload) {
	const { campaign, commercial } = payload;
	return commercial.faturamento.atual === 0 && campaign.mensagensEnviadas.atual === 0 && campaign.conversoes.atual === 0;
}

function buildApprovedReportTemplatePayload({
	toPhoneNumber,
	recipientName,
	frequency,
	imageUrl,
}: {
	toPhoneNumber: string;
	recipientName: string;
	frequency: TReportFrequency;
	imageUrl: string;
}): TemplatePayload {
	return {
		messaging_product: "whatsapp",
		to: formatPhoneForInternalGateway(toPhoneNumber),
		type: "template",
		template: {
			name: REPORT_TEMPLATE_NAME,
			language: { code: REPORT_TEMPLATE_LANGUAGE },
			components: [
				{
					type: "header",
					parameters: [
						{
							type: "image",
							image: { link: imageUrl },
						},
					],
				},
				{
					type: "body",
					parameters: [
						{
							type: "text",
							text: sanitizeTemplateParameter(getRecipientTemplateName(recipientName)),
						},
						{
							type: "text",
							text: sanitizeTemplateParameter(getReportFrequencyLabel(frequency)),
						},
					],
				},
			],
		},
	};
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
							nome: true,
							telefone: true,
						},
					},
				},
			},
		},
	});
}

async function fetchReportOrganizationById(organizationId: string) {
	return db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizationId),
		columns: {
			id: true,
			nome: true,
			logoUrl: true,
			corPrimaria: true,
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
		},
	});
}

type RunRecurrentSalesReportParams = {
	frequency: TReportFrequency;
};

type SendApprovedReportTemplateParams = {
	recipientPhone: string;
	recipientName: string;
	frequency: TReportFrequency;
	imageUrl: string;
	whatsappPhoneNumberId: string;
	whatsappToken: string;
};

async function sendApprovedReportTemplate({
	recipientPhone,
	recipientName,
	frequency,
	imageUrl,
	whatsappPhoneNumberId,
	whatsappToken,
}: SendApprovedReportTemplateParams) {
	const templatePayload = buildApprovedReportTemplatePayload({
		toPhoneNumber: recipientPhone,
		recipientName,
		frequency,
		imageUrl,
	});
	return sendTemplateWhatsappMessage({
		fromPhoneNumberId: whatsappPhoneNumberId,
		templatePayload,
		whatsappToken,
	});
}

type RunRecurrentSalesReportForRecipientParams = {
	frequency: TReportFrequency;
	organizationId: string;
	recipientPhone: string;
	recipientName?: string;
	referenceDate?: Date;
	forceSendEmptyReport?: boolean;
};

export async function runRecurrentSalesReportForRecipient({
	frequency,
	organizationId,
	recipientPhone,
	recipientName = "",
	referenceDate,
	forceSendEmptyReport = false,
}: RunRecurrentSalesReportForRecipientParams) {
	const logLabel = getReportLogLabel(frequency);
	const whatsappToken = process.env.META_ACCESS_TOKEN;
	const whatsappPhoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
	if (!whatsappToken) throw new createHttpError.InternalServerError("META_ACCESS_TOKEN não configurado.");
	if (!whatsappPhoneNumberId) throw new createHttpError.InternalServerError("META_WHATSAPP_PHONE_NUMBER_ID não configurado.");

	const organization = await fetchReportOrganizationById(organizationId);
	if (!organization) throw new createHttpError.NotFound(`Organização não encontrada: ${organizationId}.`);

	const payload = await buildCampaignReportPayload({
		frequency,
		organization: organization as TReportOrganization,
		referenceDate,
	});

	const skipped = shouldSkipReport(payload);
	if (skipped && !forceSendEmptyReport) {
		return {
			message: "Relatório sem atividade relevante; envio pulado.",
			sent: false,
			skipped: true,
			reason: "empty-report",
			organizationId,
			frequency,
			period: payload.period,
		};
	}

	console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] Rendering test report image`);
	const pngBuffer = await renderCampaignReportPng({ payload });
	const { publicUrl, storagePath } = await uploadReportImage({
		organizacaoId: organization.id,
		frequency,
		storageKey: `test-${payload.period.storageKey}`,
		pngBuffer,
	});

	console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] Sending approved report template test to ${recipientPhone}`);
	const result = await sendApprovedReportTemplate({
		recipientPhone,
		recipientName,
		frequency,
		imageUrl: publicUrl,
		whatsappPhoneNumberId,
		whatsappToken,
	});

	return {
		message: "Relatório de teste enviado com sucesso.",
		sent: true,
		skipped: false,
		organizationId,
		organizationName: organization.nome,
		recipient: formatPhoneForInternalGateway(recipientPhone),
		frequency,
		period: payload.period,
		templateName: REPORT_TEMPLATE_NAME,
		whatsappMessageId: result.whatsappMessageId,
		storagePath,
		publicUrl,
		wasEmptyReport: skipped,
	};
}

export async function runRecurrentSalesReport({ frequency }: RunRecurrentSalesReportParams) {
	const logLabel = getReportLogLabel(frequency);

	try {
		console.log(`[INFO] [${logLabel}] Starting recurrent sales report generation`);

		const whatsappToken = process.env.META_ACCESS_TOKEN;
		const whatsappPhoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
		if (!whatsappToken) throw new createHttpError.InternalServerError("META_ACCESS_TOKEN não configurado.");
		if (!whatsappPhoneNumberId) throw new createHttpError.InternalServerError("META_WHATSAPP_PHONE_NUMBER_ID não configurado.");

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

				const recipients = organization.membros
					.filter((m) => recipientIds.includes(m.usuario?.id ?? ""))
					.map((m) => ({
						name: m.usuario?.nome ?? "",
						phone: m.usuario?.telefone ?? "",
					}))
					.filter((recipient) => !!recipient.phone);
				if (recipients.length === 0) {
					console.warn(`[ORG: ${organization.id}] [WARN] [${logLabel}] No recipient phones found, skipping`);
					continue;
				}

				const payload = await buildCampaignReportPayload({
					frequency,
					organization: organization as TReportOrganization,
				});

				if (shouldSkipReport(payload)) {
					console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] No relevant stats found, skipping`);
					continue;
				}

				console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] Rendering report image`);
				const pngBuffer = await renderCampaignReportPng({ payload });
				const { publicUrl, storagePath } = await uploadReportImage({
					organizacaoId: organization.id,
					frequency,
					storageKey: payload.period.storageKey,
					pngBuffer,
				});

				for (const recipient of recipients) {
					const formattedRecipientPhone = formatPhoneForInternalGateway(recipient.phone);

					try {
						console.log(`[ORG: ${organization.id}] [INFO] [${logLabel}] Sending approved report template to ${recipient.phone}`);
						const result = await sendApprovedReportTemplate({
							recipientPhone: recipient.phone,
							recipientName: recipient.name,
							frequency,
							imageUrl: publicUrl,
							whatsappPhoneNumberId,
							whatsappToken,
						});
						allResults.push({
							organizationId: organization.id,
							recipient: formattedRecipientPhone,
							status: "success",
							delivery: "approved-template",
							messageId: result.whatsappMessageId,
							storagePath,
							templateName: REPORT_TEMPLATE_NAME,
						});
					} catch (sendError) {
						console.error(`[ORG: ${organization.id}] [ERROR] [${logLabel}] Template send failed for ${formattedRecipientPhone}:`, sendError);
						allResults.push({
							organizationId: organization.id,
							recipient: formattedRecipientPhone,
							status: "error",
							delivery: "approved-template",
							error: sendError instanceof Error ? sendError.message : "Unknown error",
							storagePath,
							templateName: REPORT_TEMPLATE_NAME,
						});
					}
				}
			} catch (error) {
				console.error(`[ORG: ${organization.id}] [ERROR] [${logLabel}] Error generating report:`, error);
			}
		}

		const successCount = allResults.filter((result) => result.status === "success").length;
		console.log(`[INFO] [${logLabel}] Reports sent: ${successCount}/${allResults.length} total`);

		return {
			message: `${frequency} report completed`,
			sent: successCount,
			total: allResults.length,
			results: allResults,
		};
	} catch (error) {
		console.error(`[ERROR] [${logLabel}] Fatal error:`, error);
		throw error;
	}
}
