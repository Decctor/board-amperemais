import {
	TCreateMessageTemplateInput,
	TCreateMessageTemplateOutput,
	TDeleteMessageTemplateInput,
	TDeleteMessageTemplateOutput,
	TUpdateMessageTemplateInput,
	TUpdateMessageTemplateOutput,
} from "@/app/api/message-templates/route";
import type {
	TCreateMessageTemplatePhoneInput,
	TCreateMessageTemplatePhoneOutput,
	TDeleteMessageTemplatePhoneInput,
	TDeleteMessageTemplatePhoneOutput,
	TSyncMessageTemplatePhoneInput,
	TSyncMessageTemplatePhoneOutput,
} from "@/app/api/message-templates/phones/route";
import type { TSyncMessageTemplatesInput, TSyncMessageTemplatesOutput } from "@/app/api/message-templates/sync/route";
import type { TTestMessageTemplateInput, TTestMessageTemplateOutput } from "@/app/api/message-templates/test/route";
import axios from "axios";

export async function createMessageTemplate(input: TCreateMessageTemplateInput) {
	const { data } = await axios.post<TCreateMessageTemplateOutput>("/api/message-templates", input);
	return data;
}

export async function updateMessageTemplate(input: TUpdateMessageTemplateInput) {
	const { data } = await axios.put<TUpdateMessageTemplateOutput>("/api/message-templates", input);
	return data;
}

export async function deleteMessageTemplate(input: TDeleteMessageTemplateInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("id", input.id);
	if (input.deleteFromMeta !== undefined) searchParams.set("deleteFromMeta", String(input.deleteFromMeta));
	const { data } = await axios.delete<TDeleteMessageTemplateOutput>(`/api/message-templates?${searchParams.toString()}`);
	return data;
}

export async function syncMessageTemplates(input?: TSyncMessageTemplatesInput) {
	const { data } = await axios.post<TSyncMessageTemplatesOutput>("/api/message-templates/sync", input ?? {});
	return data;
}

export async function testMessageTemplate(input: TTestMessageTemplateInput) {
	const { data } = await axios.post<TTestMessageTemplateOutput>("/api/message-templates/test", input);
	return data;
}

export async function createMessageTemplatePhone(input: TCreateMessageTemplatePhoneInput) {
	const { data } = await axios.post<TCreateMessageTemplatePhoneOutput>("/api/message-templates/phones", input);
	return data;
}

export async function syncMessageTemplatePhone(input: TSyncMessageTemplatePhoneInput) {
	const { data } = await axios.put<TSyncMessageTemplatePhoneOutput>("/api/message-templates/phones", input);
	return data;
}

export async function deleteMessageTemplatePhone(input: TDeleteMessageTemplatePhoneInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("messageTemplateId", input.messageTemplateId);
	searchParams.set("telefoneId", input.telefoneId);
	if (input.deleteFromMeta !== undefined) searchParams.set("deleteFromMeta", String(input.deleteFromMeta));
	const { data } = await axios.delete<TDeleteMessageTemplatePhoneOutput>(`/api/message-templates/phones?${searchParams.toString()}`);
	return data;
}

export async function submitMessageTemplate({
	messageTemplateId,
	messageTemplate,
	submitWhatsapp,
}: {
	messageTemplateId: string | null;
	messageTemplate: TCreateMessageTemplateInput["messageTemplate"];
	submitWhatsapp: TCreateMessageTemplateInput["submitWhatsapp"];
}) {
	if (messageTemplateId) {
		return updateMessageTemplate({
			messageTemplateId,
			messageTemplate,
			submitWhatsapp,
		});
	}
	return createMessageTemplate({
		messageTemplate,
		submitWhatsapp,
	});
}
