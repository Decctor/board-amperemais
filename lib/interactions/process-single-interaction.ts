import { reserveCampaignWeeklyQuota, type TCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import { db } from "@/services/drizzle";
import { sendReservedInteraction } from "./send-reserved-interaction";
import type { ImmediateProcessingData, ProcessSingleInteractionResult, TWeeklyLimitMode } from "./types";

export type TProcessSingleInteractionParams = ImmediateProcessingData & {
	weeklyLimitCache?: TCampaignWeeklyLimitCache;
	weeklyLimitMode?: TWeeklyLimitMode;
	hasHubAccess?: boolean;
};

export async function processSingleInteractionImmediately(params: TProcessSingleInteractionParams): Promise<ProcessSingleInteractionResult> {
	const { interactionId, organizationId, weeklyLimitCache, weeklyLimitMode = "enforce" } = params;

	try {
		const interaction = await db.query.interactions.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, interactionId), eq(fields.organizacaoId, organizationId)),
			columns: {
				id: true,
				campanhaId: true,
				tipo: true,
			},
		});

		if (!interaction) {
			return { success: false, error: "Interacao nao encontrada para processamento." };
		}

		if (weeklyLimitMode === "enforce" && interaction.tipo === "ENVIO-MENSAGEM" && interaction.campanhaId) {
			const reservationResult = await reserveCampaignWeeklyQuota({
				interactionId,
				organizationId,
				campaignId: interaction.campanhaId,
				cache: weeklyLimitCache,
			});
			console.log("[IMMEDIATE_PROCESS] WEEKLY QUOTA RESERVATION RESULT:", reservationResult);
			if (reservationResult.status === "INTERACTION_NOT_FOUND") {
				return { success: false, error: reservationResult.message ?? "Interacao nao encontrada para reservar quota semanal." };
			}

			if (reservationResult.status === "ALREADY_RESERVED") {
				console.warn("[WARN] [IMMEDIATE_PROCESS] Interacao ja reservada por outro worker.", {
					interactionId,
					organizationId,
					campaignId: interaction.campanhaId,
				});
				return { success: false, error: reservationResult.message ?? "Interacao ja foi reservada por outro worker." };
			}

			if (reservationResult.status === "LIMIT_REACHED") {
				console.warn("[WARN] [IMMEDIATE_PROCESS] Interacao bloqueada por limite semanal.", {
					interactionId,
					organizationId,
					campaignId: interaction.campanhaId,
					reason: reservationResult.reason,
					message: reservationResult.message,
				});
				return { success: false, error: reservationResult.message ?? "Interacao bloqueada por limite semanal." };
			}
		}

		const sendResult = await sendReservedInteraction({
			...params,
		});

		if (!sendResult.success) {
			return {
				success: false,
				error: sendResult.error ?? "Falha ao processar interacao.",
				channelsAttempted: sendResult.channelsAttempted,
				channelsSkipped: sendResult.channelsSkipped,
				channelsSent: sendResult.channelsSent,
				channelErrors: sendResult.channelErrors,
			};
		}

		return {
			success: true,
			channelsAttempted: sendResult.channelsAttempted,
			channelsSkipped: sendResult.channelsSkipped,
			channelsSent: sendResult.channelsSent,
			channelErrors: sendResult.channelErrors,
		};
	} catch (error) {
		console.error(`[IMMEDIATE_PROCESS] Error processing interaction ${interactionId}:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
