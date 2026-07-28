import type { TGetClientCashbackBalanceOutput } from "@/app/api/cashback-programs/clients/balance/route";
import type { TTopCashbackClientsInput, TTopCashbackClientsOutput } from "@/app/api/cashback-programs/clients/top/route";
import {
	TGetCashbackProgramPrizesInput,
	TGetCashbackProgramPrizesOutput,
	TGetCashbackProgramPrizesOutputById,
} from "@/app/api/cashback-programs/prizes/route";
import type { TGetCashbackProgramOutput } from "@/app/api/cashback-programs/route";
import type { TGetAvailablePosRewardsOutput } from "@/app/api/pos/cashback-rewards/available/route";
import type { TCashbackProgramsGraphInput, TCashbackProgramsGraphOutput } from "@/app/api/cashback-programs/stats/graph/route";
import type { TCashbackProgramStatsOutput } from "@/app/api/cashback-programs/stats/route";
import type { TCashbackProgramTransactionsInput, TCashbackProgramTransactionsOutput } from "@/app/api/cashback-programs/transactions/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useDebounceMemo } from "../hooks/use-debounce";
import { useState } from "react";

async function fetchCashbackProgram() {
	try {
		const { data } = await axios.get<TGetCashbackProgramOutput>("/api/cashback-programs");
		return data.data;
	} catch (error) {
		console.log("Error running fetchCashbackProgram", error);
		throw error;
	}
}

export function useCashbackProgram() {
	return {
		...useQuery({
			queryKey: ["cashback-program"],
			queryFn: fetchCashbackProgram,
		}),
		queryKey: ["cashback-program"],
	};
}

async function fetchCashbackProgramStats(period: { after: string; before: string }) {
	try {
		const { data } = await axios.post<TCashbackProgramStatsOutput>("/api/cashback-programs/stats", { period });
		return data.data;
	} catch (error) {
		console.log("Error running fetchCashbackProgramStats", error);
		throw error;
	}
}

export function useCashbackProgramStats(period: { after: string; before: string }) {
	return {
		...useQuery({
			queryKey: ["cashback-program-stats", period],
			queryFn: () => fetchCashbackProgramStats(period),
			enabled: !!period.after && !!period.before,
		}),
		queryKey: ["cashback-program-stats", period],
	};
}

async function fetchCashbackProgramTransactionsByClientId(input: TCashbackProgramTransactionsInput) {
	const { data } = await axios.post<TCashbackProgramTransactionsOutput>("/api/cashback-programs/transactions", input);
	if (!data.data.byClientId) throw new Error("Transações não encontradas.");
	return data.data.byClientId;
}

export function useCashbackProgramTransactionsByClientId(input: TCashbackProgramTransactionsInput) {
	return {
		...useQuery({
			queryKey: ["cashback-program-transactions-by-client-id", input],
			queryFn: () => fetchCashbackProgramTransactionsByClientId(input),
		}),
		queryKey: ["cashback-program-transactions-by-client-id", input],
	};
}

async function fetchCashbackProgramTransactions(input: Omit<TCashbackProgramTransactionsInput, "clientId">) {
	try {
		const { data } = await axios.post<TCashbackProgramTransactionsOutput>("/api/cashback-programs/transactions", input);
		if (!data.data.default) throw new Error("Transações não encontradas.");
		return data.data.default;
	} catch (error) {
		console.log("Error running fetchCashbackProgramTransactions", error);
		throw error;
	}
}

export function useCashbackProgramTransactions(input: Omit<TCashbackProgramTransactionsInput, "clientId">) {
	return {
		...useQuery({
			queryKey: ["cashback-program-transactions", input],
			queryFn: () => fetchCashbackProgramTransactions(input),
		}),
		queryKey: ["cashback-program-transactions", input],
	};
}

async function fetchTopCashbackClients(params: TTopCashbackClientsInput) {
	try {
		const { data } = await axios.post<TTopCashbackClientsOutput>("/api/cashback-programs/clients/top", params);
		return data.data.clients;
	} catch (error) {
		console.log("Error running fetchTopCashbackClients", error);
		throw error;
	}
}

export function useTopCashbackClients(params: TTopCashbackClientsInput) {
	return {
		...useQuery({
			queryKey: ["cashback-program-top-clients", params],
			queryFn: () => fetchTopCashbackClients(params),
		}),
		queryKey: ["cashback-program-top-clients", params],
	};
}

async function fetchCashbackProgramsGraph(params: TCashbackProgramsGraphInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("graphType", params.graphType);
	if (params.periodAfter) searchParams.set("periodAfter", params.periodAfter.toISOString());
	if (params.periodBefore) searchParams.set("periodBefore", params.periodBefore.toISOString());
	const { data } = await axios.get<TCashbackProgramsGraphOutput>(`/api/cashback-programs/stats/graph?${searchParams.toString()}`);
	return data.data;
}

export function useCashbackProgramsGraph(params: TCashbackProgramsGraphInput) {
	return {
		...useQuery({
			queryKey: ["cashback-programs-graph", params],
			queryFn: () => fetchCashbackProgramsGraph(params),
		}),
		queryKey: ["cashback-programs-graph", params],
	};
}

export async function fetchClientCashbackBalance(clienteId: string) {
	const searchParams = new URLSearchParams();
	searchParams.set("clienteId", clienteId);
	const { data } = await axios.get<TGetClientCashbackBalanceOutput>(`/api/cashback-programs/clients/balance?${searchParams.toString()}`);
	return data.data;
}

export function useClientCashbackBalance({ clienteId }: { clienteId: string | null | undefined }) {
	const queryKey = ["client-cashback-balance", clienteId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchClientCashbackBalance(clienteId as string),
			enabled: !!clienteId,
		}),
		queryKey,
	};
}

/**
 *
 * PRIZES
 */
async function fetchCashbackProgramPrizes(input: TGetCashbackProgramPrizesInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("programId", input.programId as string);
	if (input.search) searchParams.set("search", input.search);
	searchParams.set("page", input.page.toString());
	const { data } = await axios.get<TGetCashbackProgramPrizesOutput>(`/api/cashback-programs/prizes?${searchParams.toString()}`);
	const defaultData = data.data.default;
	if (!defaultData) throw new Error("Prêmios do programa de cashback não encontrados.");
	return defaultData;
}
type TUseCashbackProgramPrizesInput = {
	initialFilters: TGetCashbackProgramPrizesInput;
};
export function useCashbackProgramPrizes({ initialFilters }: TUseCashbackProgramPrizesInput) {
	const [filters, setFilters] = useState<TGetCashbackProgramPrizesInput>({
		programId: initialFilters.programId,
		search: initialFilters.search,
		page: initialFilters.page,
	});

	function updateFilters(newFilters: Partial<TGetCashbackProgramPrizesInput>) {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	}

	const debouncedSearch = useDebounceMemo({ search: filters.search }, 1000);
	const finalFilters = { ...filters, ...debouncedSearch };

	const queryKey = ["cashback-program-prizes", finalFilters];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchCashbackProgramPrizes(finalFilters),
		}),
		queryKey,
		filters,
		updateFilters,
	};
}

async function fetchCashbackProgramPrizeById(id: string) {
	const { data } = await axios.get<TGetCashbackProgramPrizesOutput>(`/api/cashback-programs/prizes?id=${id}`);
	const byIdData = data.data.byId;
	if (!byIdData) throw new Error("Prêmio do programa de cashback não encontrado.");
	return byIdData;
}

export function useCashbackProgramPrizeById({ id }: { id: string }) {
	return {
		...useQuery({
			queryKey: ["cashback-program-prize-by-id", id],
			queryFn: () => fetchCashbackProgramPrizeById(id),
		}),
		queryKey: ["cashback-program-prize-by-id", id],
	};
}

async function fetchPosAvailableRewards(clienteId: string) {
	const searchParams = new URLSearchParams();
	searchParams.set("clienteId", clienteId);
	const { data } = await axios.get<TGetAvailablePosRewardsOutput>(`/api/pos/cashback-rewards/available?${searchParams.toString()}`);
	return data.data;
}

/**
 * Recompensas (prêmios) resgatáveis pelo cliente vinculado no PDV: prêmios ativos do programa
 * com elegibilidade computada contra o saldo do cliente (`elegivel`/`motivo`).
 */
export function usePosAvailableRewards({ clienteId }: { clienteId: string | null | undefined }) {
	const queryKey = ["pos-available-rewards", clienteId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchPosAvailableRewards(clienteId as string),
			enabled: !!clienteId,
		}),
		queryKey,
	};
}
export type TPosAvailableReward = Awaited<ReturnType<typeof fetchPosAvailableRewards>>["rewards"][number];
