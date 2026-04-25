import { resolveCampaignAudienceClientIds } from "@/lib/campaigns/filters";
import type { TCampaignWithAudienceRelations, TDataCollectingV2Executor } from "./types";

async function mapWithConcurrency<TInput, TOutput>(items: TInput[], concurrency: number, mapper: (item: TInput) => Promise<TOutput>) {
	const results: TOutput[] = [];
	for (let index = 0; index < items.length; index += concurrency) {
		const slice = items.slice(index, index + concurrency);
		results.push(...(await Promise.all(slice.map(mapper))));
	}
	return results;
}

export async function resolveCampaignAudiences({
	tx,
	organizationId,
	campaigns,
	concurrency = 5,
}: {
	tx: TDataCollectingV2Executor;
	organizationId: string;
	campaigns: TCampaignWithAudienceRelations[];
	concurrency?: number;
}) {
	const entries = await mapWithConcurrency(campaigns, concurrency, async (campaign) => {
		const audience = await resolveCampaignAudienceClientIds({
			executor: tx,
			organizationId,
			segmentations: campaign.segmentacoes.map((segmentation) => segmentation.segmentacao),
			filters: campaign.filtros,
		});
		return [campaign.id, new Set(audience)] as const;
	});

	return new Map(entries);
}

export function campaignAudienceHasClient(audiencesByCampaignId: Map<string, Set<string>>, campaignId: string, clientId: string | null) {
	if (!clientId) return false;
	return audiencesByCampaignId.get(campaignId)?.has(clientId) ?? false;
}
