import type { TGetCampaignsInput, TGetCampaignsOutput } from "@/app/api/campaigns/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchCampaigns(input: Omit<TGetCampaignsInput, "id">) {
	try {
		const searchParams = new URLSearchParams();
		if (input.search) searchParams.set("search", input.search);
		if (input.activeOnly) searchParams.set("activeOnly", input.activeOnly.toString());
		const { data } = await axios.get<TGetCampaignsOutput>(`/api/campaigns?${searchParams.toString()}`);
		if (!data.data.default) throw new Error("Campanhas não encontradas.");
		return data.data.default;
	} catch (error) {
		console.log("Error running fetchCampaigns", error);
		throw error;
	}
}

type UseCampaignsParams = {
	initialFilters: Omit<TGetCampaignsInput, "id">;
};
export function useCampaigns({ initialFilters }: UseCampaignsParams) {
	const [filters, setFilters] = useState<Omit<TGetCampaignsInput, "id">>(initialFilters);
	function updateFilters(newFilters: Partial<Omit<TGetCampaignsInput, "id">>) {
		setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
	}
	const debouncedFilters = useDebounceMemo(filters, 500);
	return {
		...useQuery({
			queryKey: ["campaigns", debouncedFilters],
			queryFn: async () => await fetchCampaigns(debouncedFilters),
		}),
		queryKey: ["campaigns", debouncedFilters],
		filters,
		updateFilters,
	};
}

async function fetchCampaignById(id: string) {
	try {
		const { data } = await axios.get<TGetCampaignsOutput>(`/api/campaigns?id=${id}`);
		if (!data.data.byId) throw new Error("Campanha não encontrada.");
		return data.data.byId;
	} catch (error) {
		console.log("Error running fetchCampaignById", error);
		throw error;
	}
}

type UseCampaignByIdParams = {
	id: string;
};
export function useCampaignById({ id }: UseCampaignByIdParams) {
	return {
		...useQuery({
			queryKey: ["campaign-by-id", id],
			queryFn: async () => await fetchCampaignById(id),
		}),
		queryKey: ["campaign-by-id", id],
	};
}
