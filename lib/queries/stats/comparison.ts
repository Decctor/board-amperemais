import type { TStatsComparisonInput, TStatsComparisonOutput } from "@/pages/api/stats/comparison";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";

async function fetchStatsComparison(input: TStatsComparisonInput) {
	try {
		const { data } = await axios.post("/api/stats/comparison", input);

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
		total: {},
		saleNatures: [],
		sellers: [],
		excludedSalesIds: [],
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
