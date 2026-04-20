import type { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
import type { TGetWhatsappPhoneSpendOutput } from "@/app/api/whatsapp-connections/analytics/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchWhatsappConnection() {
	try {
		const { data } = await axios.get<TGetWhatsappConnectionsOutput>("/api/whatsapp-connections");
		return data.data;
	} catch (error) {
		console.error("Error fetching whatsapp connection", error);
		throw error;
	}
}

export function useWhatsappConnection() {
	return {
		...useQuery({
			queryKey: ["whatsapp-connection"],
			queryFn: fetchWhatsappConnection,
		}),
		queryKey: ["whatsapp-connection"],
	};
}

async function fetchWhatsappPhoneSpend(phoneId: string) {
	const { data } = await axios.get<TGetWhatsappPhoneSpendOutput>(`/api/whatsapp-connections/analytics?phoneId=${phoneId}`);
	return data.data;
}

export function useWhatsappPhoneSpend({ phoneId, enabled }: { phoneId: string; enabled: boolean }) {
	return useQuery({
		queryKey: ["whatsapp-phone-spend", phoneId],
		queryFn: () => fetchWhatsappPhoneSpend(phoneId),
		enabled,
		staleTime: 5 * 60 * 1000,
	});
}
