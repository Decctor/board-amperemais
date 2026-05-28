import { resend } from "@/services/resend";

type CampaignEnqueueFailureReport = {
	organizationId: string;
	campaignId: string;
	campaignTitle: string;
	audienceSize: number;
	enqueuedCount: number;
	failedClientIds: string[];
	errors: string[];
};

const FAILED_CLIENT_IDS_SAMPLE_SIZE = 20;

// Best-effort developer alert when a single-use campaign chunk could not be enqueued
// even after retries. Never throws: a failure to notify must not break cron processing.
export async function notifyCampaignEnqueueFailure(report: CampaignEnqueueFailureReport) {
	const recipient = process.env.BUG_REPORT_EMAIL;
	if (!recipient) {
		console.error("[CAMPAIGN_ENQUEUE_FAILURE] BUG_REPORT_EMAIL is not set; skipping developer alert email.", report);
		return;
	}

	const sampleClientIds = report.failedClientIds.slice(0, FAILED_CLIENT_IDS_SAMPLE_SIZE);
	const remainingClientIds = report.failedClientIds.length - sampleClientIds.length;
	const distinctErrors = Array.from(new Set(report.errors));

	const lines = [
		"Falha ao enfileirar interações de uma campanha de uso único após múltiplas tentativas.",
		"",
		`Organização: ${report.organizationId}`,
		`Campanha: ${report.campaignTitle} (${report.campaignId})`,
		`Tamanho da audiência: ${report.audienceSize}`,
		`Interações enfileiradas: ${report.enqueuedCount}`,
		`Clientes com falha: ${report.failedClientIds.length}`,
		"",
		"Mensagens de erro:",
		...distinctErrors.map((error) => `  - ${error}`),
		"",
		`Amostra de clientes com falha (${sampleClientIds.length}${remainingClientIds > 0 ? ` de ${report.failedClientIds.length}` : ""}):`,
		...sampleClientIds.map((clientId) => `  - ${clientId}`),
		...(remainingClientIds > 0 ? [`  ... e mais ${remainingClientIds}.`] : []),
		"",
		"A campanha permaneceu desativada e NÃO foi reativada.",
	];

	try {
		const { error } = await resend.emails.send({
			from: "RecompraCRM <noreply@recompracrm.com.br>",
			to: [recipient],
			subject: `[ALERTA] Falha ao enfileirar campanha de uso único ${report.campaignId}`,
			text: lines.join("\n"),
		});

		if (error) {
			console.error("[CAMPAIGN_ENQUEUE_FAILURE] Failed to send developer alert email:", error);
		}
	} catch (error) {
		console.error("[CAMPAIGN_ENQUEUE_FAILURE] Unexpected error sending developer alert email:", error);
	}
}
