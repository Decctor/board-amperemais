import { useQuery } from "@tanstack/react-query";
import type { TGroupedSalesStats } from "@/app/api/stats/sales-grouped/route";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import axios from "axios";

async function fetchGroupedSalesStats(filters: TSaleStatsGeneralQueryParams) {
	try {
		const searchParams = new URLSearchParams();
		searchParams.set("payload", JSON.stringify(filters));
		const { data } = await axios.get(`/api/stats/sales-grouped?${searchParams.toString()}`);
		return data.data as TGroupedSalesStats;
	} catch (error) {
		console.log("Error running fetchGroupedSalesStats");
		throw error;
	}
}

export function useGroupedSalesStats(filters: TSaleStatsGeneralQueryParams) {
	return useQuery({
		queryKey: ["grouped-sales-stats", filters],
		queryFn: async () => await fetchGroupedSalesStats(filters),
		refetchOnWindowFocus: false,
	});
}
