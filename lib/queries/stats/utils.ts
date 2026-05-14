import type { TSaleQueryFilterOptions } from "@/app/api/stats/sales-query-params/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchSaleQueryFilterOptions() {
	try {
		const { data } = await axios.get("/api/stats/sales-query-params");
		return data.data as TSaleQueryFilterOptions;
	} catch (error) {
		console.log("Error running fetchSaleQueryFilterOptions");
		throw error;
	}
}

export function useSaleQueryFilterOptions() {
	return useQuery({ queryKey: ["sale-query-filter-options"], queryFn: fetchSaleQueryFilterOptions });
}
