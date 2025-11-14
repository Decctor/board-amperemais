import type { TSalesSimplifiedSearchResult } from "@/pages/api/sales/simplified-search";
import type { TSalesSimplifiedSearchQueryParams } from "@/schemas/sales";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

async function fetchSalesSimplifiedSearch(params: TSalesSimplifiedSearchQueryParams) {
	try {
		const { data } = await axios.post("/api/sales/simplified-search", params);

		return data.data as TSalesSimplifiedSearchResult;
	} catch (error) {
		console.log("Error running fetchSalesSimplifiedSearch");
		throw error;
	}
}

export function useSalesSimplifiedSearch() {
	const [params, setParams] = useState<TSalesSimplifiedSearchQueryParams>({
		search: "",
		page: 1,
	});
	function updateParams(newParams: Partial<TSalesSimplifiedSearchQueryParams>) {
		setParams((prev) => ({ ...prev, ...newParams }));
	}
	return {
		...useQuery({
			queryKey: ["sales-simplified-search", params],
			queryFn: async () => await fetchSalesSimplifiedSearch(params),
			refetchOnWindowFocus: false,
		}),
		params,
		updateParams,
	};
}
