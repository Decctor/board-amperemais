import type { TGetFinancesCashFlowOutput } from "@/app/api/finances/analytics/cash-flow/route";
import type { TGetFinancesDreInput, TGetFinancesDreOutput } from "@/app/api/finances/analytics/dre/route";
import type { TGetFinancesReceivablesPayablesInput, TGetFinancesReceivablesPayablesOutput } from "@/app/api/finances/analytics/receivables-payables/route";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounceMemo } from "../hooks/use-debounce";

// ============================================================================
// DRE
// ============================================================================

async function fetchFinancesDre(input: TGetFinancesDreInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("periodAfter", input.periodAfter.toISOString());
	searchParams.set("periodBefore", input.periodBefore.toISOString());
	const { data } = await axios.get<TGetFinancesDreOutput>(`/api/finances/analytics/dre?${searchParams.toString()}`);
	return data.data;
}

export function useFinancesDre({ initialParams }: { initialParams: Partial<TGetFinancesDreInput> }) {
	const [params, setParams] = useState<TGetFinancesDreInput>({
		periodAfter: initialParams.periodAfter || dayjs().startOf("month").toDate(),
		periodBefore: initialParams.periodBefore || dayjs().endOf("month").toDate(),
	});
	function updateParams(newParams: Partial<TGetFinancesDreInput>) {
		setParams((prev) => ({ ...prev, ...newParams }));
	}
	const debouncedParams = useDebounceMemo(params, 500);
	return {
		...useQuery({
			queryKey: ["finances-analytics-dre", debouncedParams],
			queryFn: () => fetchFinancesDre(debouncedParams),
		}),
		queryKey: ["finances-analytics-dre", debouncedParams],
		params,
		updateParams,
	};
}

// ============================================================================
// CASH FLOW
// ============================================================================

async function fetchFinancesCashFlow({ horizonDays }: { horizonDays: number }) {
	const searchParams = new URLSearchParams();
	searchParams.set("horizonDays", horizonDays.toString());
	const { data } = await axios.get<TGetFinancesCashFlowOutput>(`/api/finances/analytics/cash-flow?${searchParams.toString()}`);
	return data.data;
}

export function useFinancesCashFlow({ initialHorizonDays = 90 }: { initialHorizonDays?: number } = {}) {
	const [horizonDays, setHorizonDays] = useState(initialHorizonDays);
	return {
		...useQuery({
			queryKey: ["finances-analytics-cash-flow", horizonDays],
			queryFn: () => fetchFinancesCashFlow({ horizonDays }),
		}),
		queryKey: ["finances-analytics-cash-flow", horizonDays],
		horizonDays,
		setHorizonDays,
	};
}

// ============================================================================
// RECEIVABLES & PAYABLES
// ============================================================================

async function fetchFinancesReceivablesPayables(input: TGetFinancesReceivablesPayablesInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("periodAfter", input.periodAfter.toISOString());
	searchParams.set("periodBefore", input.periodBefore.toISOString());
	const { data } = await axios.get<TGetFinancesReceivablesPayablesOutput>(`/api/finances/analytics/receivables-payables?${searchParams.toString()}`);
	return data.data;
}

export function useFinancesReceivablesPayables({ initialParams }: { initialParams: Partial<TGetFinancesReceivablesPayablesInput> }) {
	const [params, setParams] = useState<TGetFinancesReceivablesPayablesInput>({
		periodAfter: initialParams.periodAfter || dayjs().startOf("month").toDate(),
		periodBefore: initialParams.periodBefore || dayjs().endOf("month").toDate(),
	});
	function updateParams(newParams: Partial<TGetFinancesReceivablesPayablesInput>) {
		setParams((prev) => ({ ...prev, ...newParams }));
	}
	const debouncedParams = useDebounceMemo(params, 500);
	return {
		...useQuery({
			queryKey: ["finances-analytics-receivables-payables", debouncedParams],
			queryFn: () => fetchFinancesReceivablesPayables(debouncedParams),
		}),
		queryKey: ["finances-analytics-receivables-payables", debouncedParams],
		params,
		updateParams,
	};
}
