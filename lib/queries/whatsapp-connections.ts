import type { TGetWhatsappConnectionOutput } from "@/app/api/whatsapp-connections/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchWhatsappConnection() {
	try {
		const { data } = await axios.get<TGetWhatsappConnectionOutput>("/api/whatsapp-connections");
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
			// Poll for status updates when Internal Gateway is not connected
			refetchInterval: (query) => {
				const data = query.state.data;
				if (
					data?.tipoConexao === "INTERNAL_GATEWAY" &&
					data?.gatewayStatus !== "connected"
				) {
					return 5000; // Poll every 5 seconds
				}
				return false; // No polling
			},
		}),
		queryKey: ["whatsapp-connection"],
	};
}
