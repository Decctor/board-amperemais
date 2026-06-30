import type {
	TGetProductionRecipeByIdInput,
	TGetProductionRecipesDefaultInput,
	TGetProductionRecipesOutput,
} from "@/app/api/productions/recipes/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "./../hooks/use-debounce";

async function fetchProductionRecipes(input: TGetProductionRecipesDefaultInput) {
	const searchParams = new URLSearchParams();
	if (input.page) searchParams.set("page", input.page.toString());
	if (input.search) searchParams.set("search", input.search);
	if (input.activeOnly !== undefined && input.activeOnly !== null) searchParams.set("activeOnly", String(input.activeOnly));

	const { data } = await axios.get<TGetProductionRecipesOutput>(`/api/productions/recipes?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Receitas de produção não encontradas.");
	return result;
}

type UseProductionRecipesParams = {
	initialFilters?: Partial<TGetProductionRecipesDefaultInput>;
};
export function useProductionRecipes({ initialFilters }: UseProductionRecipesParams = {}) {
	const [filters, setFilters] = useState<TGetProductionRecipesDefaultInput>({
		page: initialFilters?.page ?? 1,
		search: initialFilters?.search ?? "",
		activeOnly: initialFilters?.activeOnly ?? true,
	});

	function updateFilters(newFilters: Partial<TGetProductionRecipesDefaultInput>) {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	}

	const debouncedSearch = useDebounceMemo(
		{
			search: filters.search,
		},
		800,
	);
	const finalFilters = { ...filters, ...debouncedSearch };
	const queryKey = ["production-recipes", finalFilters];

	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchProductionRecipes(finalFilters),
		}),
		queryKey,
		filters,
		updateFilters,
	};
}

async function fetchProductionRecipeById(input: TGetProductionRecipeByIdInput) {
	const { data } = await axios.get<TGetProductionRecipesOutput>(`/api/productions/recipes?id=${input.id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Receita de produção não encontrada.");
	return result;
}

export function useProductionRecipeById({ id }: TGetProductionRecipeByIdInput) {
	const queryKey = ["production-recipe-by-id", id];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchProductionRecipeById({ id }),
			enabled: !!id,
		}),
		queryKey,
	};
}
