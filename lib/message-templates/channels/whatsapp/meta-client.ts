import axios from "axios";
import type { TMetaCreateTemplatePayload, TMetaTemplate } from "./types";

const GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0";

function getMetaApiErrorMessage(error: unknown, fallbackMessage: string): string {
	if (!axios.isAxiosError(error)) return fallbackMessage;
	const metaError = error.response?.data?.error;
	const userMessage = typeof metaError?.error_user_msg === "string" ? metaError.error_user_msg.trim() : "";
	const message = typeof metaError?.message === "string" ? metaError.message.trim() : "";
	return userMessage || message || error.message || fallbackMessage;
}

export async function createMetaWhatsappTemplate({
	accessToken,
	whatsappBusinessAccountId,
	payload,
}: {
	accessToken: string;
	whatsappBusinessAccountId: string;
	payload: TMetaCreateTemplatePayload;
}): Promise<{ id: string; status: string; category?: string }> {
	try {
		const response = await axios.post(`${GRAPH_API_BASE_URL}/${whatsappBusinessAccountId}/message_templates`, payload, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});
		return response.data;
	} catch (error) {
		throw new Error(getMetaApiErrorMessage(error, "Erro ao criar template no WhatsApp."));
	}
}

export async function getMetaWhatsappTemplate({
	accessToken,
	templateId,
	fields,
}: {
	accessToken: string;
	templateId: string;
	fields?: string[];
}): Promise<TMetaTemplate> {
	try {
		const response = await axios.get<TMetaTemplate>(`${GRAPH_API_BASE_URL}/${templateId}`, {
			params: fields?.length ? { fields: fields.join(",") } : undefined,
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
		return response.data;
	} catch (error) {
		throw new Error(getMetaApiErrorMessage(error, "Erro ao buscar template no WhatsApp."));
	}
}

export async function editMetaWhatsappTemplate({
	accessToken,
	templateId,
	payload,
}: {
	accessToken: string;
	templateId: string;
	payload: Partial<TMetaCreateTemplatePayload>;
}): Promise<{ success: boolean }> {
	try {
		const response = await axios.post(`${GRAPH_API_BASE_URL}/${templateId}`, payload, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});
		return response.data;
	} catch (error) {
		throw new Error(getMetaApiErrorMessage(error, "Erro ao editar template no WhatsApp."));
	}
}

export async function deleteMetaWhatsappTemplate({
	accessToken,
	whatsappBusinessAccountId,
	templateName,
}: {
	accessToken: string;
	whatsappBusinessAccountId: string;
	templateName: string;
}): Promise<{ success: boolean }> {
	try {
		const response = await axios.delete(`${GRAPH_API_BASE_URL}/${whatsappBusinessAccountId}/message_templates`, {
			params: { name: templateName },
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
		return response.data;
	} catch (error) {
		throw new Error(getMetaApiErrorMessage(error, "Erro ao excluir template no WhatsApp."));
	}
}

export async function listMetaWhatsappTemplates({
	accessToken,
	whatsappBusinessAccountId,
	fields,
	status,
	limit = 250,
}: {
	accessToken: string;
	whatsappBusinessAccountId: string;
	fields?: string[];
	status?: string;
	limit?: number;
}): Promise<TMetaTemplate[]> {
	try {
		const templates: TMetaTemplate[] = [];
		let nextUrl: string | null = null;
		const baseUrl = `${GRAPH_API_BASE_URL}/${whatsappBusinessAccountId}/message_templates`;

		do {
			const response: { data: { data?: TMetaTemplate[]; paging?: { next?: string } } } = await axios.get(nextUrl ?? baseUrl, {
				params: nextUrl
					? undefined
					: {
							fields: fields?.join(","),
							status,
							limit,
						},
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});
			templates.push(...(response.data.data ?? []));
			nextUrl = response.data.paging?.next ?? null;
		} while (nextUrl);

		return templates;
	} catch (error) {
		throw new Error(getMetaApiErrorMessage(error, "Erro ao listar templates no WhatsApp."));
	}
}
