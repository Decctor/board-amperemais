import type { TSalesGraphInput, TSalesGraphOutput } from "@/pages/api/stats/sales-graph";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchSalesGraph(filters: TSalesGraphInput) {
	try {
		const { data } = await axios.post("/api/stats/sales-graph", filters);
		return data.data as TSalesGraphOutput;
	} catch (error) {
		console.log("Error running fetchSalesGraph");
		throw error;
	}
}

export function useSalesGraph(filters: TSalesGraphInput) {
	return useQuery({
		queryKey: ["sales-graph", filters],
		queryFn: async () => await fetchSalesGraph(filters),
		refetchOnWindowFocus: false,
	});
}
