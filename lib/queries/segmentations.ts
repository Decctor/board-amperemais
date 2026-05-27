import type { TGetRFMHealthOutput } from "@/app/api/segmentations/rfm-health/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchRFMHealth({ months }: { months?: number }) {
	const params = new URLSearchParams();
	if (months) params.set("months", String(months));
	const url = params.toString() ? `/api/segmentations/rfm-health?${params.toString()}` : "/api/segmentations/rfm-health";
	const { data } = await axios.get<TGetRFMHealthOutput>(url);
	return data.data;
}

export function useRFMHealth({ months }: { months?: number } = {}) {
	const queryKey = ["rfm-health", months ?? 12] as const;
	return {
		...useQuery({ queryKey, queryFn: () => fetchRFMHealth({ months }) }),
		queryKey,
	};
}
