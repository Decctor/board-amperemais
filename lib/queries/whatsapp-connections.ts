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
		}),
		queryKey: ["whatsapp-connection"],
	};
}
