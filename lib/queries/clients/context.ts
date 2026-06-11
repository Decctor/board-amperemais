import type { TGetClientContextOutput } from "@/app/api/clients/context/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export async function fetchClientContext(clientId: string) {
	const searchParams = new URLSearchParams();
	searchParams.set("clientId", clientId);
	const { data } = await axios.get<TGetClientContextOutput>(`/api/clients/context?${searchParams.toString()}`);
	return data.data;
}

export function useClientContext({ clientId }: { clientId: string | null | undefined }) {
	const queryKey = ["client-context", clientId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchClientContext(clientId as string),
			enabled: !!clientId,
			staleTime: 5 * 60 * 1000, // 5 minutes — client profile rarely changes mid-sale
		}),
		queryKey,
	};
}
