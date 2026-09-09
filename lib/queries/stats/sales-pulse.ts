import type { TGetSalesPulseOutput } from "@/app/api/stats/sales-pulse/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type TSalesPulseParams = { dayStart: Date; days?: number };

async function fetchSalesPulse(params: TSalesPulseParams) {
	const searchParams = new URLSearchParams();
	searchParams.set("dayStart", params.dayStart.toISOString());
	if (params.days) searchParams.set("days", String(params.days));
	const { data } = await axios.get<TGetSalesPulseOutput>(`/api/stats/sales-pulse?${searchParams.toString()}`);
	return data.data;
}

export function useSalesPulse(params: TSalesPulseParams) {
	const queryKey = ["sales-pulse", params.dayStart.toISOString(), params.days ?? 7];
	return {
		...useQuery({ queryKey, queryFn: () => fetchSalesPulse(params), refetchInterval: 120_000 }),
		queryKey,
	};
}
