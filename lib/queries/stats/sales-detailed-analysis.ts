import type { TGetSalesDetailedAnalysisOutput, TSalesDetailedAnalysisInput } from "@/pages/api/stats/sales-detailed-analysis";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";
async function fetchSalesDetailedAnalysis(filters: TSalesDetailedAnalysisInput) {
	try {
		const { data } = await axios.post<TGetSalesDetailedAnalysisOutput>("/api/stats/sales-detailed-analysis", filters);
		return data.data;
	} catch (error) {
		console.log("Error running fetchSalesDetailedAnalysis");
		throw error;
	}
}

type TUseSalesDetailedAnalysisOptions = {
	initialParams?: Partial<TSalesDetailedAnalysisInput>;
};
export function useSalesDetailedAnalysis({ initialParams }: TUseSalesDetailedAnalysisOptions) {
	const monthStart = dayjs().startOf("month").toISOString();
	const monthEnd = dayjs().endOf("month").toISOString();
	const [params, setParams] = useState<TSalesDetailedAnalysisInput>({
		weekday: initialParams?.weekday || 0,
		hourIntervalStart: initialParams?.hourIntervalStart || undefined,
		hourIntervalEnd: initialParams?.hourIntervalEnd || undefined,
		periodStart: initialParams?.periodStart || monthStart,
		periodEnd: initialParams?.periodEnd || monthEnd,
	});
	function updateParams(newParams: Partial<TSalesDetailedAnalysisInput>) {
		setParams((prev) => ({ ...prev, ...newParams }));
	}
	return {
		...useQuery({
			queryKey: ["sales-detailed-analysis", params],
			queryFn: async () => await fetchSalesDetailedAnalysis(params),
			refetchOnWindowFocus: false,
		}),
		params,
		updateParams,
	};
}
