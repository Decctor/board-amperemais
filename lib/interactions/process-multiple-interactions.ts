import { createCampaignWeeklyLimitCache, type TCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import { delay, type ImmediateProcessingData, processSingleInteractionImmediately, type ProcessSingleInteractionResult } from "./process-single-interaction";

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

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_DELAY_BETWEEN_BATCHES_MS = 100;

function chunkArray<T>(array: T[], size: number): T[][] {
	if (size <= 0) return [array];

	const chunks: T[][] = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}

	return chunks;
}

async function processInteractionChunk({
	interactions,
	weeklyLimitCache,
}: {
	interactions: ImmediateProcessingData[];
	weeklyLimitCache: TCampaignWeeklyLimitCache;
}): Promise<TProcessMultipleInteractionItemResult[]> {
	const settledResults = await Promise.allSettled(
		interactions.map(async (interaction) => ({
			interactionId: interaction.interactionId,
			result: await processSingleInteractionImmediately({
				...interaction,
				weeklyLimitCache,
			}),
		})),
	);

	return settledResults.map((settledResult, index) => {
		if (settledResult.status === "fulfilled") {
			return settledResult.value;
		}

		return {
			interactionId: interactions[index]?.interactionId ?? "unknown-interaction",
			result: {
				success: false,
				error: settledResult.reason instanceof Error ? settledResult.reason.message : "Erro desconhecido ao processar interação.",
			},
		};
	});
}

export async function processMultipleInteractions({
	interactions,
	options,
}: TProcessMultipleInteractionsParams): Promise<TProcessMultipleInteractionsResult> {
	const startedAt = Date.now();
	const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
	const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
	const delayBetweenBatchesMs = options?.delayBetweenBatchesMs ?? DEFAULT_DELAY_BETWEEN_BATCHES_MS;
	const continueOnError = options?.continueOnError ?? true;
	const weeklyLimitCache = options?.weeklyLimitCache ?? createCampaignWeeklyLimitCache();

	if (interactions.length === 0) {
		return {
			total: 0,
			succeeded: 0,
			failed: 0,
			durationMs: 0,
			batchesProcessed: 0,
			results: [],
		};
	}

	const interactionBatches = chunkArray(interactions, batchSize);
	const results: TProcessMultipleInteractionItemResult[] = [];

	for (const [batchIndex, interactionBatch] of interactionBatches.entries()) {
		const concurrentChunks = chunkArray(interactionBatch, concurrency);

		for (const concurrentChunk of concurrentChunks) {
			const chunkResults = await processInteractionChunk({
				interactions: concurrentChunk,
				weeklyLimitCache,
			});

			results.push(...chunkResults);

			if (!continueOnError && chunkResults.some((chunkResult) => !chunkResult.result.success)) {
				const succeeded = results.filter((itemResult) => itemResult.result.success).length;
				return {
					total: interactions.length,
					succeeded,
					failed: results.length - succeeded,
					durationMs: Date.now() - startedAt,
					batchesProcessed: batchIndex,
					results,
				};
			}
		}

		if (delayBetweenBatchesMs > 0 && batchIndex < interactionBatches.length - 1) {
			await delay(delayBetweenBatchesMs);
		}
	}

	const succeeded = results.filter((itemResult) => itemResult.result.success).length;

	return {
		total: interactions.length,
		succeeded,
		failed: results.length - succeeded,
		durationMs: Date.now() - startedAt,
		batchesProcessed: interactionBatches.length,
		results,
	};
}
