import type { TDeleteWhatsappConnectionOutput } from "@/app/api/whatsapp-connections/route";
import axios from "axios";

export async function deleteWhatsappConnection(input: string) {
	const { data } = await axios.delete<TDeleteWhatsappConnectionOutput>(`/api/whatsapp-connections?id=${input}`);
	return data;
}
