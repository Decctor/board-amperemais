import { campaignAudienceHasClient, resolveCampaignAudiencesByCampaignId } from "@/lib/campaigns/filters";
import type { TCampaignWithAudienceRelations, TDataCollectingV2Executor } from "./types";

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
	return resolveCampaignAudiencesByCampaignId({
		executor: tx,
		organizationId,
		campaigns,
		concurrency,
	});
}

export { campaignAudienceHasClient };
