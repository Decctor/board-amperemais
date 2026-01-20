import type { TCreateWhatsappTemplateInput, TCreateWhatsappTemplateOutput } from "@/app/api/whatsapp-templates/route";
import type { TSyncWhatsappTemplatesInput, TSyncWhatsappTemplatesOutput } from "@/app/api/whatsapp-templates/sync/route";
import axios from "axios";

export async function createWhatsappTemplate(input: TCreateWhatsappTemplateInput) {
	const { data } = await axios.post<TCreateWhatsappTemplateOutput>("/api/whatsapp-templates", input);
	return data;
}

export async function syncWhatsappTemplates(input?: TSyncWhatsappTemplatesInput) {
	const { data } = await axios.post<TSyncWhatsappTemplatesOutput>("/api/whatsapp-templates/sync", input || {});
	return data;
}
