import type { TSaleQueryFilterOptions } from "@/pages/api/stats/sales-query-params";
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
