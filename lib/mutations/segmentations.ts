import { TSyncSegmentationsInput, TSyncSegmentationsOutput } from "@/app/api/segmentations/sync/route";
import axios from "axios";

export async function syncSegmentations(input: TSyncSegmentationsInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("runCampaigns", input.runCampaigns.toString());
	const url = `/api/segmentations/sync?${searchParams.toString()}`;
	const { data } = await axios.get<TSyncSegmentationsOutput>(url);
	return data;
}
