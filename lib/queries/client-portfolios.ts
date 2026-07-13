import type { TGetInteractionsOutput } from "@/app/api/interactions/route";
import type { TGetRoutineOutput } from "@/app/api/routine/route";
import type { TGetRoutinePortfolioOutput } from "@/app/api/routine/portfolio/route";
import type { TGetRoutineStatsOutput } from "@/app/api/routine/stats/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchRoutine(vendedorId: string | null) {
	const searchParams = new URLSearchParams();
	if (vendedorId) searchParams.set("vendedorId", vendedorId);
	const { data } = await axios.get<TGetRoutineOutput>(`/api/routine?${searchParams.toString()}`);
	return data.data;
}

export function useRoutine({ vendedorId }: { vendedorId: string | null }) {
	const queryKey = ["routine", vendedorId];
	return {
		...useQuery({ queryKey, queryFn: () => fetchRoutine(vendedorId) }),
		queryKey,
	};
}

async function fetchRoutineStats(vendedorId: string | null) {
	const searchParams = new URLSearchParams();
	if (vendedorId) searchParams.set("vendedorId", vendedorId);
	const { data } = await axios.get<TGetRoutineStatsOutput>(`/api/routine/stats?${searchParams.toString()}`);
	return data.data;
}

export function useRoutineStats({ vendedorId }: { vendedorId: string | null }) {
	const queryKey = ["routine-stats", vendedorId];
	return {
		...useQuery({ queryKey, queryFn: () => fetchRoutineStats(vendedorId) }),
		queryKey,
	};
}

type TRoutinePortfolioFilters = {
	segmento: string | null;
	page: number;
};

async function fetchRoutinePortfolio({ vendedorId, filters }: { vendedorId: string | null; filters: TRoutinePortfolioFilters }) {
	const searchParams = new URLSearchParams();
	if (vendedorId) searchParams.set("vendedorId", vendedorId);
	if (filters.segmento) searchParams.set("segmento", filters.segmento);
	if (filters.page) searchParams.set("page", filters.page.toString());
	const { data } = await axios.get<TGetRoutinePortfolioOutput>(`/api/routine/portfolio?${searchParams.toString()}`);
	return data.data;
}

export function useRoutinePortfolio({ vendedorId }: { vendedorId: string | null }) {
	const [filters, setFilters] = useState<TRoutinePortfolioFilters>({ segmento: null, page: 1 });
	function updateFilters(newFilters: Partial<TRoutinePortfolioFilters>) {
		setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
	}
	const debouncedFilters = useDebounceMemo(filters, 300);
	const queryKey = ["routine-portfolio", vendedorId, debouncedFilters];
	return {
		...useQuery({ queryKey, queryFn: () => fetchRoutinePortfolio({ vendedorId, filters: debouncedFilters }) }),
		queryKey,
		filters,
		updateFilters,
	};
}

async function fetchClientInteractions({ clienteId, limit }: { clienteId: string; limit?: number }) {
	const searchParams = new URLSearchParams();
	searchParams.set("clienteId", clienteId);
	if (limit) searchParams.set("limit", limit.toString());
	const { data } = await axios.get<TGetInteractionsOutput>(`/api/interactions?${searchParams.toString()}`);
	return data.data;
}

export function useClientInteractions({ clienteId, limit, enabled = true }: { clienteId: string; limit?: number; enabled?: boolean }) {
	const queryKey = ["client-interactions", clienteId, limit];
	return {
		...useQuery({ queryKey, queryFn: () => fetchClientInteractions({ clienteId, limit }), enabled }),
		queryKey,
	};
}
