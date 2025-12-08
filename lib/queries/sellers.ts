import type { TGetSellersByIdInput, TGetSellersDefaultInput, TGetSellersInput, TGetSellersOutput } from "@/pages/api/sellers";
import type { TGetSellerStatsInput, TGetSellerStatsOutput } from "@/pages/api/sellers/stats";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchSellers(input: TGetSellersDefaultInput) {
	try {
		const searchParams = new URLSearchParams();
		if (input.search) searchParams.set("search", input.search);
		if (input.sellersIds) searchParams.set("sellersIds", input.sellersIds.join(","));
		if (input.statsSaleNatures) searchParams.set("statsSaleNatures", input.statsSaleNatures.join(","));
		if (input.statsExcludedSalesIds) searchParams.set("statsExcludedSalesIds", input.statsExcludedSalesIds.join(","));
		if (input.statsTotalMin) searchParams.set("statsTotalMin", input.statsTotalMin.toString());
		if (input.statsTotalMax) searchParams.set("statsTotalMax", input.statsTotalMax.toString());
		if (input.statsPeriodAfter) searchParams.set("statsPeriodAfter", input.statsPeriodAfter.toISOString());
		if (input.statsPeriodBefore) searchParams.set("statsPeriodBefore", input.statsPeriodBefore.toISOString());
		if (input.orderByField) searchParams.set("orderByField", input.orderByField);
		if (input.orderByDirection) searchParams.set("orderByDirection", input.orderByDirection);
		if (input.page) searchParams.set("page", input.page.toString());
		const { data } = await axios.get<TGetSellersOutput>(`/api/sellers?${searchParams.toString()}`);
		const result = data.data.default;
		if (!result) throw new Error("Vendedores não encontrados.");
		return result;
	} catch (error) {
		console.log("Error running fetchSellers", error);
		throw error;
	}
}

async function fetchSellersById(input: TGetSellersByIdInput) {
	try {
		const { data } = await axios.get<TGetSellersOutput>(`/api/sellers?id=${input.id}`);
		const result = data.data.byId;
		if (!result) throw new Error("Vendedor não encontrado.");
		return result;
	} catch (error) {
		console.log("Error running fetchSellersById", error);
		throw error;
	}
}

export function useSellerById({ id }: { id: string }) {
	return {
		...useQuery({
			queryKey: ["seller-by-id", id],
			queryFn: () => fetchSellersById({ id }),
		}),
		queryKey: ["seller-by-id", id],
	};
}

type UseSellersParams = {
	initialFilters?: Partial<TGetSellersDefaultInput>;
};
export function useSellers({ initialFilters }: UseSellersParams) {
	const [filters, setFilters] = useState<TGetSellersDefaultInput>({
		page: initialFilters?.page || 1,
		sellersIds: initialFilters?.sellersIds || [],
		statsSaleNatures: initialFilters?.statsSaleNatures || [],
		statsExcludedSalesIds: initialFilters?.statsExcludedSalesIds || [],
		statsTotalMin: initialFilters?.statsTotalMin || null,
		statsTotalMax: initialFilters?.statsTotalMax || null,
		search: initialFilters?.search || "",
		statsPeriodAfter: initialFilters?.statsPeriodAfter || null,
		statsPeriodBefore: initialFilters?.statsPeriodBefore || null,
		orderByField: initialFilters?.orderByField || "nome",
		orderByDirection: initialFilters?.orderByDirection || "asc",
	});
	function updateFilters(newParams: Partial<TGetSellersDefaultInput>) {
		setFilters((prevFilters) => ({ ...prevFilters, ...newParams }));
	}

	const debouncedFilters = useDebounceMemo(filters, 500);
	return {
		...useQuery({
			queryKey: ["sellers", debouncedFilters],
			queryFn: () => fetchSellers(debouncedFilters),
		}),
		queryKey: ["sellers", debouncedFilters],
		filters,
		updateFilters,
	};
}

async function fetchSellerStats(input: TGetSellerStatsInput) {
	try {
		const searchParams = new URLSearchParams();
		searchParams.set("sellerId", input.sellerId);
		if (input.periodAfter) searchParams.set("periodAfter", input.periodAfter);
		if (input.periodBefore) searchParams.set("periodBefore", input.periodBefore);
		const { data } = await axios.get<TGetSellerStatsOutput>(`/api/sellers/stats?${searchParams.toString()}`);
		return data.data;
	} catch (error) {
		console.log("Error running fetchSellerStats", error);
		throw error;
	}
}

type UseSellerStatsParams = {
	sellerId: string;
	initialFilters?: Partial<Omit<TGetSellerStatsInput, "sellerId">>;
};
export function useSellerStats({ sellerId, initialFilters }: UseSellerStatsParams) {
	const [filters, setFilters] = useState<Omit<TGetSellerStatsInput, "sellerId">>({
		periodAfter: initialFilters?.periodAfter || null,
		periodBefore: initialFilters?.periodBefore || null,
	});
	function updateFilters(newFilters: Partial<Omit<TGetSellerStatsInput, "sellerId">>) {
		setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
	}
	const debouncedFilters = useDebounceMemo(filters, 1000);
	return {
		...useQuery({
			queryKey: ["seller-stats", sellerId, debouncedFilters],
			queryFn: () => fetchSellerStats({ sellerId, ...debouncedFilters }),
		}),
		queryKey: ["seller-stats", sellerId, debouncedFilters],
		filters,
		updateFilters,
	};
}
