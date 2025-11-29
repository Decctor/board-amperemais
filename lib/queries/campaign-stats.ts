import type { TCampaignStatsOutput, TGetCampaignStatsInput } from "@/app/api/utils/sales-promo-campaign-stats/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchCampaignStats(input: TGetCampaignStatsInput): Promise<TCampaignStatsOutput["data"]> {
	try {
		const searchParams = new URLSearchParams();
		searchParams.set("campaignId", input.campaignId);
		const { data } = await axios.get<TCampaignStatsOutput>(`/api/utils/sales-promo-campaign-stats?${searchParams.toString()}`);
		return data.data;
	} catch (error) {
		console.log("Error running fetchCampaignStats", error);
		throw error;
	}
}

type UseCampaignStatsParams = {
	campaignId: string;
};

export function useCampaignStats({ campaignId }: UseCampaignStatsParams) {
	return {
		...useQuery({
			queryKey: ["campaign-stats", campaignId],
			queryFn: () => fetchCampaignStats({ campaignId }),
			enabled: !!campaignId,
		}),
		queryKey: ["campaign-stats", campaignId],
	};
}
