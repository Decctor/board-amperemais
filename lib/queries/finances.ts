import { TGetFinancesOverallStatsInput, TGetFinancesOverallStatsOutput } from "@/app/api/finances/stats/route";
import { TGetAccountingEntriesInput, TGetAccountingEntriesOutput } from "@/app/api/finances/accounting-entries/route";
import { TGetFinancialTransactionsOutput } from "@/app/api/finances/financial-transactions/route";
import { TGetFinancialAccountsOutput } from "@/app/api/finances/financial-accounts/route";
import axios from "axios";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useDebounceMemo } from "../hooks/use-debounce";

async function getFinancesOverallStats(input: TGetFinancesOverallStatsInput) {
	const searchParams = new URLSearchParams();
	if (input.periodAfter) searchParams.set("periodAfter", input.periodAfter.toISOString());
	if (input.periodBefore) searchParams.set("periodBefore", input.periodBefore.toISOString());
	const { data } = await axios.get<TGetFinancesOverallStatsOutput>(`/api/finances/stats?${searchParams.toString()}`);
	return data.data;
}

type UseFinancesOverallStatsParams = {
	initialParams: Partial<TGetFinancesOverallStatsInput>;
};
export function useFinancesOverallStats({ initialParams }: UseFinancesOverallStatsParams) {
	const monthStart = dayjs().startOf("month").toDate();
	const monthEnd = dayjs().endOf("month").toDate();
	const [params, setParams] = useState<TGetFinancesOverallStatsInput>({
		periodAfter: initialParams.periodAfter || monthStart,
		periodBefore: initialParams.periodBefore || monthEnd,
	});
	function updateParams(newParams: Partial<TGetFinancesOverallStatsInput>) {
		setParams((prev) => ({ ...prev, ...newParams }));
	}
	return {
		...useQuery({
			queryKey: ["finances-overall-stats", params],
			queryFn: () => getFinancesOverallStats(params),
		}),
		queryKey: ["finances-overall-stats", params],
		params,
		updateParams,
	};
}

// ============================================================================
// ACCOUNTING ENTRIES
// ============================================================================

async function fetchAccountingEntries(filters: TGetAccountingEntriesInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("page", filters.page.toString());
	if (filters.search) searchParams.set("search", filters.search);
	if (filters.periodAfter) searchParams.set("periodAfter", filters.periodAfter.toISOString());
	if (filters.periodBefore) searchParams.set("periodBefore", filters.periodBefore.toISOString());
	if (filters.originTypes && filters.originTypes.length > 0) searchParams.set("originTypes", filters.originTypes.join(","));
	const { data } = await axios.get<TGetAccountingEntriesOutput>(`/api/finances/accounting-entries?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Oops, houve um erro ao buscar os lançamentos.");
	return result;
}

type UseFinancesAccountingEntriesParams = {
	initialFilters?: Partial<TGetAccountingEntriesInput>;
};
export function useFinancesAccountingEntries({ initialFilters }: UseFinancesAccountingEntriesParams) {
	const [filters, setFilters] = useState<TGetAccountingEntriesInput>({
		page: initialFilters?.page || 1,
		search: initialFilters?.search || "",
		periodAfter: initialFilters?.periodAfter || null,
		periodBefore: initialFilters?.periodBefore || null,
		originTypes: initialFilters?.originTypes || [],
	});
	function updateFilters(newFilters: Partial<TGetAccountingEntriesInput>) {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	}
	const debouncedSearch = useDebounceMemo({ search: filters.search }, 500);
	const finalFilters = { ...filters, ...debouncedSearch };
	return {
		...useQuery({
			queryKey: ["finances-accounting-entries", finalFilters],
			queryFn: () => fetchAccountingEntries(finalFilters),
		}),
		queryKey: ["finances-accounting-entries", finalFilters],
		filters,
		updateFilters,
	};
}

// ============================================================================
// FINANCIAL TRANSACTIONS
// ============================================================================

type FinancialTransactionsFilters = {
	page: number;
	search: string;
	periodAfter: Date | null;
	periodBefore: Date | null;
	types: string[];
	paymentMethods: string[];
	statuses: string[];
};

async function fetchFinancialTransactions(filters: FinancialTransactionsFilters) {
	const searchParams = new URLSearchParams();
	searchParams.set("page", filters.page.toString());
	if (filters.search) searchParams.set("search", filters.search);
	if (filters.periodAfter) searchParams.set("periodAfter", filters.periodAfter.toISOString());
	if (filters.periodBefore) searchParams.set("periodBefore", filters.periodBefore.toISOString());
	if (filters.types.length > 0) searchParams.set("types", filters.types.join(","));
	if (filters.paymentMethods.length > 0) searchParams.set("paymentMethods", filters.paymentMethods.join(","));
	if (filters.statuses.length > 0) searchParams.set("statuses", filters.statuses.join(","));
	const { data } = await axios.get<TGetFinancialTransactionsOutput>(`/api/finances/financial-transactions?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Oops, houve um erro ao buscar as movimentações.");
	return result;
}

type UseFinancesTransactionsParams = {
	initialFilters?: Partial<FinancialTransactionsFilters>;
};
export function useFinancesTransactions({ initialFilters }: UseFinancesTransactionsParams) {
	const [filters, setFilters] = useState<FinancialTransactionsFilters>({
		page: initialFilters?.page || 1,
		search: initialFilters?.search || "",
		periodAfter: initialFilters?.periodAfter || null,
		periodBefore: initialFilters?.periodBefore || null,
		types: initialFilters?.types || [],
		paymentMethods: initialFilters?.paymentMethods || [],
		statuses: initialFilters?.statuses || [],
	});
	function updateFilters(newFilters: Partial<FinancialTransactionsFilters>) {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	}
	const debouncedSearch = useDebounceMemo({ search: filters.search }, 500);
	const finalFilters = { ...filters, ...debouncedSearch };
	return {
		...useQuery({
			queryKey: ["finances-financial-transactions", finalFilters],
			queryFn: () => fetchFinancialTransactions(finalFilters),
		}),
		queryKey: ["finances-financial-transactions", finalFilters],
		filters,
		updateFilters,
	};
}

// ============================================================================
// FINANCIAL ACCOUNTS
// ============================================================================

type FinancialAccountsFilters = {
	activeOnly: boolean;
};

async function fetchFinancialAccounts(filters: FinancialAccountsFilters) {
	const searchParams = new URLSearchParams();
	searchParams.set("activeOnly", filters.activeOnly ? "true" : "false");
	const { data } = await axios.get<TGetFinancialAccountsOutput>(`/api/finances/financial-accounts?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Oops, houve um erro ao buscar as contas financeiras.");
	return result;
}

type UseFinancesAccountsParams = {
	initialFilters?: Partial<FinancialAccountsFilters>;
};
export function useFinancesAccounts({ initialFilters }: UseFinancesAccountsParams) {
	const [filters, setFilters] = useState<FinancialAccountsFilters>({
		activeOnly: initialFilters?.activeOnly ?? true,
	});
	function updateFilters(newFilters: Partial<FinancialAccountsFilters>) {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	}
	return {
		...useQuery({
			queryKey: ["finances-financial-accounts", filters],
			queryFn: () => fetchFinancialAccounts(filters),
		}),
		queryKey: ["finances-financial-accounts", filters],
		filters,
		updateFilters,
	};
}
