import type { TStatsComparisonInput, TStatsComparisonOutput } from "@/app/api/stats/comparison/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";

async function fetchStatsComparison(input: TStatsComparisonInput) {
	try {
		const searchParams = new URLSearchParams();
		searchParams.set("payload", JSON.stringify(input));
		const { data } = await axios.get(`/api/stats/comparison?${searchParams.toString()}`);

		return data.data as TStatsComparisonOutput;
	} catch (error) {
		console.error("Error fetching stats comparison:", error);
		throw error;
	}
}

type UseStatsComparisonParams = {
	initialFilters: Partial<TStatsComparisonInput>;
};
export function useStatsComparison({ initialFilters }: UseStatsComparisonParams) {
	const initialFirstPeriod = {
		after: dayjs().startOf("month").toISOString(),
		before: dayjs().endOf("month").toISOString(),
	};
	const initialSecondPeriod = {
		after: dayjs().subtract(1, "month").startOf("month").toISOString(),
		before: dayjs().subtract(1, "month").endOf("month").toISOString(),
	};
	const [filters, setFilters] = useState<TStatsComparisonInput>({
		firstPeriod: {
			after: initialFilters.firstPeriod?.after || initialFirstPeriod.after,
			before: initialFilters.firstPeriod?.before || initialFirstPeriod.before,
		},
		secondPeriod: {
			after: initialFilters.secondPeriod?.after || initialSecondPeriod.after,
			before: initialFilters.secondPeriod?.before || initialSecondPeriod.before,
		},
	});

	function updateFilters(newFilters: Partial<TStatsComparisonInput>) {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	}

	return {
		...useQuery({
			queryKey: ["stats-comparison", filters],
			queryFn: async () => await fetchStatsComparison(filters),
		}),
		filters,
		updateFilters,
	};
}
