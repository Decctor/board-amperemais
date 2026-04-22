import { type TCampaignWeeklyLimitCache, createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import { processOrganizationInteractionsBatch } from "./process-organization-interactions";
import type { ImmediateProcessingData, ProcessSingleInteractionResult } from "./types";

export type TProcessMultipleInteractionsOptions = {
	batchSize?: number;
	concurrency?: number;
	delayBetweenBatchesMs?: number;
	continueOnError?: boolean;
	weeklyLimitCache?: TCampaignWeeklyLimitCache;
};

export type TProcessMultipleInteractionItemResult = {
	interactionId: string;
	result: ProcessSingleInteractionResult;
};

export type TProcessMultipleInteractionsResult = {
	total: number;
	succeeded: number;
	failed: number;
	durationMs: number;
	batchesProcessed: number;
	results: TProcessMultipleInteractionItemResult[];
};

type TProcessMultipleInteractionsParams = {
	interactions: ImmediateProcessingData[];
	options?: TProcessMultipleInteractionsOptions;
};

export async function processMultipleInteractions({
	interactions,
	options,
}: TProcessMultipleInteractionsParams): Promise<TProcessMultipleInteractionsResult> {
	const startedAt = Date.now();
	const weeklyLimitCache = options?.weeklyLimitCache ?? createCampaignWeeklyLimitCache();
	const interactionsByOrganizationId = new Map<string, ImmediateProcessingData[]>();
	const results: TProcessMultipleInteractionItemResult[] = [];

	for (const interaction of interactions) {
		const organizationInteractions = interactionsByOrganizationId.get(interaction.organizationId);
		if (organizationInteractions) {
			organizationInteractions.push(interaction);
			continue;
		}

		interactionsByOrganizationId.set(interaction.organizationId, [interaction]);
	}

	let batchesProcessed = 0;

	for (const [organizationId, organizationInteractions] of interactionsByOrganizationId) {
		const organizationResult = await processOrganizationInteractionsBatch({
			organizationId,
			interactions: organizationInteractions,
			sendConcurrency: options?.concurrency,
			weeklyLimitCache,
		});

		results.push(
			...organizationResult.results.map((itemResult) => ({
				interactionId: itemResult.interactionId,
				result: itemResult.success
					? { success: true }
					: {
							success: false,
							error: itemResult.error,
					  },
			})),
		);

		batchesProcessed += 1;

		if (options?.continueOnError === false && organizationResult.failed > 0) {
			break;
		}
	}

	const succeeded = results.filter((itemResult) => itemResult.result.success).length;

	return {
		total: interactions.length,
		succeeded,
		failed: results.length - succeeded,
		durationMs: Date.now() - startedAt,
		batchesProcessed,
		results,
	};
}
