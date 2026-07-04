import type { TGetProductStockLotByIdInput, TGetProductStockLotsDefaultInput, TGetProductStockLotsOutput } from "@/app/api/products/stock-lots/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "./../hooks/use-debounce";

async function fetchProductStockLots(input: TGetProductStockLotsDefaultInput) {
	const searchParams = new URLSearchParams();
	if (input.page) searchParams.set("page", input.page.toString());
	if (input.search) searchParams.set("search", input.search);
	if (input.status.length > 0) searchParams.set("status", input.status.join(","));
	if (input.productId) searchParams.set("productId", input.productId);
	if (input.productVariantId) searchParams.set("productVariantId", input.productVariantId);
	if (input.dueInDays !== null && input.dueInDays !== undefined) searchParams.set("dueInDays", input.dueInDays.toString());

	const { data } = await axios.get<TGetProductStockLotsOutput>(`/api/products/stock-lots?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Lotes não encontrados.");
	return result;
}

type UseProductStockLotsParams = {
	initialFilters?: Partial<TGetProductStockLotsDefaultInput>;
};
export function useProductStockLots({ initialFilters }: UseProductStockLotsParams = {}) {
	const [filters, setFilters] = useState<TGetProductStockLotsDefaultInput>({
		page: initialFilters?.page ?? 1,
		search: initialFilters?.search ?? "",
		status: initialFilters?.status ?? [],
		productId: initialFilters?.productId ?? null,
		productVariantId: initialFilters?.productVariantId ?? null,
		dueInDays: initialFilters?.dueInDays ?? null,
	});

	function updateFilters(newFilters: Partial<TGetProductStockLotsDefaultInput>) {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	}

	const debouncedSearch = useDebounceMemo({ search: filters.search }, 800);
	const finalFilters = { ...filters, ...debouncedSearch };
	const queryKey = ["product-stock-lots", finalFilters];

	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchProductStockLots(finalFilters),
		}),
		queryKey,
		filters,
		updateFilters,
	};
}

async function fetchProductStockLotById(input: TGetProductStockLotByIdInput) {
	const { data } = await axios.get<TGetProductStockLotsOutput>(`/api/products/stock-lots?id=${input.id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Lote não encontrado.");
	return result;
}

export function useProductStockLotById({ id }: TGetProductStockLotByIdInput) {
	const queryKey = ["product-stock-lot-by-id", id];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchProductStockLotById({ id }),
			enabled: !!id,
		}),
		queryKey,
	};
}
