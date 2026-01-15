import type { TGetRFMConfigOutput } from "@/pages/api/settings/rfm";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchRFMConfig() {
	const { data } = await axios.get<TGetRFMConfigOutput>("/api/settings/rfm");
	return data.data;
}

export function useRFMConfigQuery() {
	return {
		...useQuery({
			queryKey: ["rfm-config"],
			queryFn: fetchRFMConfig,
		}),
		queryKey: ["rfm-config"],
	};
}
