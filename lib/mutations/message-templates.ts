import {
	TCreateMessageTemplateInput,
	TCreateMessageTemplateOutput,
	TUpdateMessageTemplateInput,
	TUpdateMessageTemplateOutput,
} from "@/app/api/message-templates/route";
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

export async function testMessageTemplate(input: TTestMessageTemplateInput) {
	const { data } = await axios.post<TTestMessageTemplateOutput>("/api/message-templates/test", input);
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
