import type { TSaleGraph } from "@/pages/api/stats/sales-graph";
import type { TSalesGraphFilters } from "@/schemas/query-params-utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchSalesGraph(filters: TSalesGraphFilters) {
	try {
		const { data } = await axios.post("/api/stats/sales-graph", filters);
		return data.data as TSaleGraph;
	} catch (error) {
		console.log("Error running fetchSalesGraph");
		throw error;
	}
}

export function useSalesGraph(filters: TSalesGraphFilters) {
	return useQuery({
		queryKey: ["sales-graph", filters],
		queryFn: async () => await fetchSalesGraph(filters),
		refetchOnWindowFocus: false,
	});
}
