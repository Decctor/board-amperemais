import type { TCreateWhatsappTemplateInput, TCreateWhatsappTemplateOutput } from "@/app/api/whatsapp-templates/route";
import axios from "axios";

export async function createWhatsappTemplate(input: TCreateWhatsappTemplateInput) {
	const { data } = await axios.post<TCreateWhatsappTemplateOutput>("/api/whatsapp-templates", input);
	return data;
}
