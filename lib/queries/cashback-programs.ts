import type { TTopCashbackClientsInput, TTopCashbackClientsOutput } from "@/app/api/cashback-programs/clients/top/route";
import type { TGetCashbackProgramOutput } from "@/app/api/cashback-programs/route";
import type { TCashbackProgramStatsInput, TCashbackProgramStatsOutput } from "@/app/api/cashback-programs/stats/route";
import type { TCashbackProgramTransactionsInput, TCashbackProgramTransactionsOutput } from "@/app/api/cashback-programs/transactions/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

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

async function fetchCashbackProgramTransactions(params: TCashbackProgramTransactionsInput) {
	try {
		const { data } = await axios.post<TCashbackProgramTransactionsOutput>("/api/cashback-programs/transactions", params);
		return data.data;
	} catch (error) {
		console.log("Error running fetchCashbackProgramTransactions", error);
		throw error;
	}
}

export function useCashbackProgramTransactions(params: TCashbackProgramTransactionsInput) {
	return {
		...useQuery({
			queryKey: ["cashback-program-transactions", params],
			queryFn: () => fetchCashbackProgramTransactions(params),
		}),
		queryKey: ["cashback-program-transactions", params],
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
