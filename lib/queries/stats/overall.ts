import type { TOverallSalesStats } from "@/pages/api/stats/sales-overall";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchOverallSalesStats(filters: TSaleStatsGeneralQueryParams) {
	try {
		const { data } = await axios.post("/api/stats/sales-overall", filters);
		return data.data as TOverallSalesStats;
	} catch (error) {
		console.log("Error running fetchOverallSalesStats");
		throw error;
	}
}

export function useOverallSalesStats(filters: TSaleStatsGeneralQueryParams) {
	return useQuery({
		queryKey: ["overall-sales-stats", filters],
		queryFn: async () => await fetchOverallSalesStats(filters),
		refetchOnWindowFocus: false,
	});
}
