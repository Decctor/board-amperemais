import type { TGetProductsByIdInput, TGetProductsDefaultInput, TGetProductsInput, TGetProductsOutput } from "@/pages/api/products";
import type { TGetProductStatsInput, TGetProductStatsOutput } from "@/pages/api/products/stats";
import type { TProductStatsQueryParams } from "@/schemas/products";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchProducts(input: TGetProductsDefaultInput) {
	try {
		const searchParams = new URLSearchParams();
		if (input.page) searchParams.set("page", input.page.toString());
		if (input.search) searchParams.set("search", input.search);
		if (input.grupo) searchParams.set("grupo", input.grupo);
		if (input.orderByField) searchParams.set("orderByField", input.orderByField);
		if (input.orderByDirection) searchParams.set("orderByDirection", input.orderByDirection);
		const { data } = await axios.get<TGetProductsOutput>(`/api/products?${searchParams.toString()}`);
		const result = data.data.default;
		if (!result) throw new Error("Produtos não encontrados.");
		return result;
	} catch (error) {
		console.log("Error running fetchProducts", error);
		throw error;
	}
}

async function fetchProductById(input: TGetProductsByIdInput) {
	try {
		const { data } = await axios.get<TGetProductsOutput>(`/api/products?id=${input.id}`);
		const result = data.data.byId;
		if (!result) throw new Error("Produto não encontrado.");
		return result;
	} catch (error) {
		console.log("Error running fetchProductById", error);
		throw error;
	}
}

export function useProductById({ id }: { id: string }) {
	return {
		...useQuery({
			queryKey: ["product-by-id", id],
			queryFn: () => fetchProductById({ id }),
		}),
		queryKey: ["product-by-id", id],
	};
}

type UseProductsParams = {
	initialFilters?: Partial<TGetProductsDefaultInput>;
};
export function useProducts({ initialFilters }: UseProductsParams) {
	const [filters, setFilters] = useState<TGetProductsDefaultInput>({
		page: initialFilters?.page || 1,
		search: initialFilters?.search || "",
		grupo: initialFilters?.grupo || null,
		orderByField: initialFilters?.orderByField || "descricao",
		orderByDirection: initialFilters?.orderByDirection || "asc",
	});
	function updateFilters(newParams: Partial<TGetProductsDefaultInput>) {
		setFilters((prevFilters) => ({ ...prevFilters, ...newParams }));
	}

	const debouncedFilters = useDebounceMemo(filters, 500);
	return {
		...useQuery({
			queryKey: ["products", debouncedFilters],
			queryFn: () => fetchProducts(debouncedFilters),
		}),
		queryKey: ["products", debouncedFilters],
		filters,
		updateFilters,
	};
}

async function fetchProductStats(input: TGetProductStatsInput) {
	try {
		const searchParams = new URLSearchParams();
		searchParams.set("productId", input.productId);
		if (input.periodAfter) searchParams.set("periodAfter", input.periodAfter);
		if (input.periodBefore) searchParams.set("periodBefore", input.periodBefore);
		if (input.sellerId) searchParams.set("sellerId", input.sellerId);
		if (input.partnerId) searchParams.set("partnerId", input.partnerId);
		if (input.saleNatures && input.saleNatures.length > 0) {
			searchParams.set("saleNatures", JSON.stringify(input.saleNatures));
		}
		const { data } = await axios.get<TGetProductStatsOutput>(`/api/products/stats?${searchParams.toString()}`);
		return data.data;
	} catch (error) {
		console.log("Error running fetchProductStats", error);
		throw error;
	}
}

type UseProductStatsParams = {
	productId: string;
	initialFilters?: Partial<Omit<TGetProductStatsInput, "productId">>;
};
export function useProductStats({ productId, initialFilters }: UseProductStatsParams) {
	const [filters, setFilters] = useState<Omit<TGetProductStatsInput, "productId">>({
		periodAfter: initialFilters?.periodAfter || null,
		periodBefore: initialFilters?.periodBefore || null,
		sellerId: initialFilters?.sellerId || null,
		partnerId: initialFilters?.partnerId || null,
		saleNatures: initialFilters?.saleNatures || null,
	});
	function updateFilters(newFilters: Partial<Omit<TGetProductStatsInput, "productId">>) {
		setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
	}
	const debouncedFilters = useDebounceMemo(filters, 1000);
	return {
		...useQuery({
			queryKey: ["product-stats", productId, debouncedFilters],
			queryFn: () => fetchProductStats({ productId, ...debouncedFilters }),
		}),
		queryKey: ["product-stats", productId, debouncedFilters],
		filters,
		updateFilters,
	};
}
