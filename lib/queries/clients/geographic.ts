import type { TGetClientsByLocationOutput } from "@/app/api/clients/stats/by-location/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export async function fetchClientsByLocation() {
	const { data } = await axios.get<TGetClientsByLocationOutput>("/api/clients/stats/by-location");
	return data.data;
}

export function useClientsByLocation() {
	const queryKey = ["clients-by-location"];
	return {
		...useQuery({
			queryKey,
			queryFn: fetchClientsByLocation,
			staleTime: 5 * 60 * 1000, // 5 minutes — a distribuição geográfica muda pouco ao longo do dia
		}),
		queryKey,
	};
}
