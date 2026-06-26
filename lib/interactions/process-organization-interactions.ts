import {
	type TCampaignWeeklyLimitCache,
	createCampaignWeeklyLimitCache,
	reserveOrganizationWeeklyQuotaBatch,
} from "@/lib/interactions/campaign-weekly-limits";
import { db } from "@/services/drizzle";
import { sendReservedInteraction, type TChatPromiseCache } from "./send-reserved-interaction";
import type {
	ImmediateProcessingData,
	TProcessOrganizationInteractionsBatchItemResult,
	TProcessOrganizationInteractionsBatchResult,
	TWeeklyLimitMode,
} from "./types";

const DEFAULT_SEND_CONCURRENCY = 10;

function chunkArray<T>(array: T[], size: number): T[][] {
	if (size <= 0) return [array];

	const chunks: T[][] = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}

	return chunks;
}

async function resolveHasHubAccess(organizationId: string) {
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizationId),
		columns: { configuracao: true },
	});

	return organization?.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;
}

export async function processOrganizationInteractionsBatch({
	organizationId,
	interactions,
	sendConcurrency = DEFAULT_SEND_CONCURRENCY,
	weeklyLimitCache,
	weeklyLimitMode = "enforce",
	hasHubAccess,
}: {
	organizationId: string;
	interactions: ImmediateProcessingData[];
	sendConcurrency?: number;
	weeklyLimitCache?: TCampaignWeeklyLimitCache;
	weeklyLimitMode?: TWeeklyLimitMode;
	hasHubAccess?: boolean;
}): Promise<TProcessOrganizationInteractionsBatchResult> {
	const startedAt = Date.now();
	const effectiveWeeklyLimitCache = weeklyLimitCache ?? createCampaignWeeklyLimitCache();
	const interactionsById = new Map<string, ImmediateProcessingData>();

	for (const interaction of interactions) {
		if (interaction.organizationId !== organizationId) {
			throw new Error(`Interaction ${interaction.interactionId} does not belong to organization ${organizationId}.`);
		}

		if (!interactionsById.has(interaction.interactionId)) {
			interactionsById.set(interaction.interactionId, interaction);
		}
	}

	const deduplicatedInteractions = [...interactionsById.values()];
	if (deduplicatedInteractions.length === 0) {
		return {
			total: 0,
			claimed: 0,
			blocked: 0,
			sent: 0,
			queued: 0,
			failed: 0,
			alreadyReserved: 0,
			missing: 0,
			durationMs: 0,
			results: [],
		};
	}

	const results: TProcessOrganizationInteractionsBatchItemResult[] = [];
	const claimResult =
		weeklyLimitMode === "skip"
			? {
					claimedInteractionIds: deduplicatedInteractions.map((interaction) => interaction.interactionId),
					blockedInteractionIds: [],
					alreadyReservedInteractionIds: [],
					missingInteractionIds: [],
					blockedMessagesByInteractionId: new Map<string, string>(),
				}
			: await reserveOrganizationWeeklyQuotaBatch({
					organizationId,
					interactionIds: deduplicatedInteractions.map((interaction) => interaction.interactionId),
					cache: effectiveWeeklyLimitCache,
				});

	for (const interactionId of claimResult.blockedInteractionIds) {
		results.push({
			interactionId,
			success: false,
			status: "BLOCKED",
			error: claimResult.blockedMessagesByInteractionId.get(interactionId) ?? "Interacao bloqueada por limite semanal.",
		});
	}

	for (const interactionId of claimResult.alreadyReservedInteractionIds) {
		results.push({
			interactionId,
			success: false,
			status: "ALREADY_RESERVED",
			error: "Interacao ja foi reservada por outro worker.",
		});
	}

	for (const interactionId of claimResult.missingInteractionIds) {
		results.push({
			interactionId,
			success: false,
			status: "MISSING",
			error: "Interacao nao encontrada para processamento.",
		});
	}

	if (claimResult.missingInteractionIds.length > 0) {
		const sampleMissingInteractionIds = claimResult.missingInteractionIds.slice(0, 5);
		console.warn(`[ORG: ${organizationId}] [WARN] [PROCESS_ORGANIZATION_INTERACTIONS_BATCH] Missing interactions during reservation`, {
			missingInteractions: claimResult.missingInteractionIds.length,
			totalInteractions: deduplicatedInteractions.length,
			sampleMissingInteractionIds,
			sampleMissingInteractionOrganizations: sampleMissingInteractionIds.map((interactionId) => interactionsById.get(interactionId)?.organizationId ?? null),
		});
	}

	const claimedInteractions = claimResult.claimedInteractionIds
		.map((interactionId) => interactionsById.get(interactionId))
		.filter((interaction): interaction is ImmediateProcessingData => !!interaction);

	let sent = 0;
	let queued = 0;
	let failed = 0;

	if (claimedInteractions.length > 0) {
		const effectiveHasHubAccess = hasHubAccess ?? (await resolveHasHubAccess(organizationId));
		const chatIdCache: TChatPromiseCache = new Map();
		const sendBatches = chunkArray(claimedInteractions, sendConcurrency);

		for (const sendBatch of sendBatches) {
			const sendResults = await Promise.allSettled(
				sendBatch.map((interaction) =>
					sendReservedInteraction({
						...interaction,
						hasHubAccess: effectiveHasHubAccess,
						chatIdCache,
					}),
				),
			);

			sendResults.forEach((sendResult, index) => {
				const interactionId = sendBatch[index]?.interactionId ?? "unknown-interaction";

				if (sendResult.status !== "fulfilled") {
					failed += 1;
					results.push({
						interactionId,
						success: false,
						status: "FAILED",
						error: sendResult.reason instanceof Error ? sendResult.reason.message : "Erro desconhecido ao processar interacao.",
					});
					return;
				}

				if (sendResult.value.status === "SENT") {
					sent += 1;
				} else if (sendResult.value.status === "QUEUED") {
					queued += 1;
				} else {
					failed += 1;
				}

				results.push({
					interactionId,
					success: sendResult.value.success,
					status: sendResult.value.status,
					error: sendResult.value.error,
				});
			});
		}
	}
	console.log(`[ORG: ${organizationId}] [INFO] [PROCESS_ORGANIZATION_INTERACTIONS_BATCH]`, {
		totalTime: Date.now() - startedAt,
		totalInteractions: deduplicatedInteractions.length,
		claimedInteractions: claimResult.claimedInteractionIds.length,
		blockedInteractions: claimResult.blockedInteractionIds.length,
		sentInteractions: sent,
		queuedInteractions: queued,
		failedInteractions:
			failed + claimResult.blockedInteractionIds.length + claimResult.alreadyReservedInteractionIds.length + claimResult.missingInteractionIds.length,
		alreadyReservedInteractions: claimResult.alreadyReservedInteractionIds.length,
		missingInteractions: claimResult.missingInteractionIds.length,
	});
	return {
		total: deduplicatedInteractions.length,
		claimed: claimResult.claimedInteractionIds.length,
		blocked: claimResult.blockedInteractionIds.length,
		sent,
		queued,
		failed:
			failed + claimResult.blockedInteractionIds.length + claimResult.alreadyReservedInteractionIds.length + claimResult.missingInteractionIds.length,
		alreadyReserved: claimResult.alreadyReservedInteractionIds.length,
		missing: claimResult.missingInteractionIds.length,
		durationMs: Date.now() - startedAt,
		results,
	};
}
