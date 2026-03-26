import { TGetFinancesOverallStatsInput, TGetFinancesOverallStatsOutput } from "@/app/api/finances/stats/route";
import axios from "axios";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
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
