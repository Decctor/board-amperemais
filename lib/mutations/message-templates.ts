import type { TAddMessageTemplateVersionOutput, TCreateMessageTemplateOutput } from "@/app/api/message-templates/route";
import type { TSyncMessageTemplatesInput, TSyncMessageTemplatesOutput } from "@/app/api/message-templates/sync/route";
import type { TCreateMessageTemplateInput, TAddMessageTemplateVersionInput } from "@/schemas/message-templates";
import axios from "axios";

export async function createMessageTemplate(input: TCreateMessageTemplateInput) {
	const { data } = await axios.post<TCreateMessageTemplateOutput>("/api/message-templates", input);
	return data;
}

export async function addMessageTemplateVersion(input: TAddMessageTemplateVersionInput) {
	const { data } = await axios.put<TAddMessageTemplateVersionOutput>("/api/message-templates", input);
	return data;
}

export async function syncMessageTemplates(input?: TSyncMessageTemplatesInput) {
	const { data } = await axios.post<TSyncMessageTemplatesOutput>("/api/message-templates/sync", input ?? {});
	return data;
}
