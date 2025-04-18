import { useQuery } from "@tanstack/react-query";
import type { TGroupedSalesStats } from "@/pages/api/stats/sales-grouped";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import axios from "axios";

async function fetchGroupedSalesStats(filters: TSaleStatsGeneralQueryParams) {
	try {
		const { data } = await axios.post("/api/stats/sales-grouped", filters);
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
