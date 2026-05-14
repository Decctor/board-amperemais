import type { TSalesGraphInput, TSalesGraphOutput } from "@/app/api/stats/sales-graph/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchSalesGraph(filters: TSalesGraphInput) {
	try {
		const searchParams = new URLSearchParams();
		searchParams.set("payload", JSON.stringify(filters));
		const { data } = await axios.get(`/api/stats/sales-graph?${searchParams.toString()}`);
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
