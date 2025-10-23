import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { formatWithoutDiacritics } from "../formatting";
import type { TClientDTO, TClientSearchQueryParams } from "@/schemas/clients";
import type { TGetClientsBySearchOutput } from "@/pages/api/clients/search";
import type { TGetClientStatsInput, TGetClientStatsOutput } from "@/pages/api/clients/stats";

async function fetchClients() {
	try {
		const { data } = await axios.get("/api/clients");

		return data.data as TClientDTO[];
	} catch (error) {
		console.log("Error running fetchClients", error);
		throw error;
	}
}

export function useClients() {
	const [filters, setFilters] = useState({
		search: "",
	});
	function matchSearch(item: TClientDTO) {
		if (filters.search.trim().length === 0) return true;
		return formatWithoutDiacritics(item.nome, true).includes(formatWithoutDiacritics(filters.search, true));
	}
	function handleModelData(data: TClientDTO[]) {
		return data.filter((d) => matchSearch(d));
	}
	return {
		...useQuery({
			queryKey: ["clients"],
			queryFn: fetchClients,
			select: (data) => handleModelData(data),
		}),
		filters,
		setFilters,
	};
}

async function fetchClientsBySearch(params: TClientSearchQueryParams) {
	try {
		const { data } = await axios.post("/api/clients/search", params);

		return data.data as TGetClientsBySearchOutput;
	} catch (error) {
		console.log("Error running fetchClientsBySearch", error);
		throw error;
	}
}

type UseClientsBySearchParams = {
	initialParams: Partial<TClientSearchQueryParams>;
};
export function useClientsBySearch({ initialParams }: UseClientsBySearchParams) {
	const [queryParams, setQueryParams] = useState<TClientSearchQueryParams>({
		page: initialParams?.page || 1,
		name: initialParams?.name || "",
		phone: initialParams?.phone || "",
		acquisitionChannels: initialParams?.acquisitionChannels || [],
		rfmTitles: initialParams?.rfmTitles || [],
		total: {},
		saleNatures: [],
		excludedSalesIds: [],
		period: { after: initialParams?.period?.after, before: initialParams?.period?.before },
	});

	function updateQueryParams(newParams: Partial<TClientSearchQueryParams>) {
		setQueryParams((prevParams) => ({ ...prevParams, ...newParams }));
	}

	return {
		...useQuery({
			queryKey: ["clients-by-search", queryParams],
			queryFn: () => fetchClientsBySearch(queryParams),
		}),
		queryParams,
		updateQueryParams,
	};
}

async function fetchClientStatsById(input: TGetClientStatsInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("clientId", input.clientId);
	if (input.periodAfter) searchParams.set("periodAfter", input.periodAfter);
	if (input.periodBefore) searchParams.set("periodBefore", input.periodBefore);
	const { data } = await axios.get<TGetClientStatsOutput>(`/api/clients/stats?${searchParams.toString()}`);
	return data.data;
}

type UseClientStatsByIdParams = {
	clientId: string;
	initialFilters: Partial<Omit<TGetClientStatsInput, "clientId">>;
};
export function useClientStatsById({ clientId, initialFilters }: UseClientStatsByIdParams) {
	const [filters, setFilters] = useState<Omit<TGetClientStatsInput, "clientId">>({
		periodAfter: initialFilters?.periodAfter || null,
		periodBefore: initialFilters?.periodBefore || null,
	});
	function updateFilters(newFilters: Partial<Omit<TGetClientStatsInput, "clientId">>) {
		setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
	}
	return {
		...useQuery({
			queryKey: ["client-stats-by-id", clientId, filters],
			queryFn: () => fetchClientStatsById({ clientId, ...filters }),
		}),
		queryKey: ["client-stats-by-id", clientId, filters],
		filters,
		updateFilters,
	};
}
