import type { TGlobalSearchEntityType, TGetGlobalSearchOutput } from "@/app/api/global-search/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type TFetchGlobalSearchInput = {
	search: string;
	entities: TGlobalSearchEntityType[];
	limit?: number;
};

async function fetchGlobalSearch(input: TFetchGlobalSearchInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("search", input.search);
	if (input.entities.length > 0) searchParams.set("entities", input.entities.join(","));
	if (input.limit) searchParams.set("limit", input.limit.toString());
	const { data } = await axios.get<TGetGlobalSearchOutput>(`/api/global-search?${searchParams.toString()}`);
	return data.data.results;
}

export type TGlobalSearchResults = Awaited<ReturnType<typeof fetchGlobalSearch>>;

/**
 * Busca da paleta de comandos. O chamador já entrega o termo debounced e decide `enabled`: a rota
 * exige 2+ caracteres, e disparar com menos só devolveria um erro de validação.
 */
export function useGlobalSearch({ search, entities, limit = 5, enabled = true }: TFetchGlobalSearchInput & { enabled?: boolean }) {
	const queryKey = ["global-search", search, entities, limit] as const;
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchGlobalSearch({ search, entities, limit }),
			enabled: enabled && search.trim().length >= 2,
			staleTime: 30_000,
			placeholderData: (previous) => previous,
		}),
		queryKey,
	};
}
