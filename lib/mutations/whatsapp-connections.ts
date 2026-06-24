import type { TSyncWhatsappContactsOutput } from "@/app/api/whatsapp-connections/contacts-sync/route";
import type { TDeleteWhatsappConnectionOutput } from "@/app/api/whatsapp-connections/route";
import axios from "axios";

export async function syncWhatsappContacts(phoneId: string) {
	const params = new URLSearchParams({ phoneId });
	const { data } = await axios.post<TSyncWhatsappContactsOutput>(`/api/whatsapp-connections/contacts-sync?${params.toString()}`);
	return data;
}
export async function deleteWhatsappConnection(input: string) {
	const { data } = await axios.delete<TDeleteWhatsappConnectionOutput>(`/api/whatsapp-connections?id=${input}`);
	return data;
}
