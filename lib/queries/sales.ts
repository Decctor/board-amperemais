import type { TGetSalesInput, TGetSalesOutput } from "@/pages/api/sales";
import type { TSalesSimplifiedSearchResult } from "@/pages/api/sales/simplified-search";
import type { TSalesSimplifiedSearchQueryParams } from "@/schemas/sales";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

async function fetchSales(input: TGetSalesInput) {
	const searchParams = new URLSearchParams();
	if (input.page) searchParams.set("page", input.page.toString());
	if (input.search) searchParams.set("search", input.search);
	if (input.periodAfter) searchParams.set("periodAfter", input.periodAfter.toISOString());
	if (input.periodBefore) searchParams.set("periodBefore", input.periodBefore.toISOString());
	if (input.sellersIds) searchParams.set("sellersIds", input.sellersIds.join(","));
	if (input.partnersIds) searchParams.set("partnersIds", input.partnersIds.join(","));
	if (input.saleNatures) searchParams.set("saleNatures", input.saleNatures.join(","));
	const { data } = await axios.get<TGetSalesOutput>(`/api/sales?${searchParams.toString()}`);
	if (!data.data.default) throw new Error("Vendas não encontradas.");
	return data.data.default;
}

type UseSalesParams = {
	initialParams: Partial<TGetSalesInput>;
};
export function useSales({ initialParams }: UseSalesParams) {
	const [params, setParams] = useState<TGetSalesInput>({
		page: initialParams.page || 1,
		search: initialParams.search || "",
		periodAfter: initialParams.periodAfter || null,
		periodBefore: initialParams.periodBefore || null,
		sellersIds: initialParams.sellersIds || [],
		partnersIds: initialParams.partnersIds || [],
		saleNatures: initialParams.saleNatures || [],
	});
	function updateParams(newParams: Partial<TGetSalesInput>) {
		setParams((prev) => ({ ...prev, ...newParams }));
	}
	return {
		...useQuery({
			queryKey: ["sales", params],
			queryFn: async () => await fetchSales(params),
		}),
		queryKey: ["sales", params],
		params,
		updateParams,
	};
}

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
