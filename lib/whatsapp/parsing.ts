import { formatWhatsappIdAsPhone } from "./utils";

type WhatsAppMessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

type AppMessageStatus = "ENVIADO" | "RECEBIDO" | "LIDO";
export type AppWhatsappStatus = "PENDENTE" | "ENVIADO" | "ENTREGUE" | "LIDO" | "FALHOU";

type StatusUpdateResult = {
	status: AppMessageStatus;
	whatsappStatus: AppWhatsappStatus;
};

export function mapWhatsAppStatusToAppStatus(whatsappStatus: WhatsAppMessageStatus): StatusUpdateResult {
	switch (whatsappStatus) {
		case "pending":
			return {
				status: "ENVIADO",
				whatsappStatus: "PENDENTE",
			};
		case "sent":
			return {
				status: "ENVIADO",
				whatsappStatus: "ENVIADO",
			};
		case "delivered":
			return {
				status: "RECEBIDO",
				whatsappStatus: "ENTREGUE",
			};
		case "read":
			return {
				status: "LIDO",
				whatsappStatus: "LIDO",
			};
		case "failed":
			return {
				status: "ENVIADO",
				whatsappStatus: "FALHOU",
			};
		default:
			return {
				status: "ENVIADO",
				whatsappStatus: "PENDENTE",
			};
	}
}
type ParsedStatusUpdate = {
	whatsappMessageId: string;
	status: WhatsAppMessageStatus;
	timestamp: number;
	errorMessage?: string;
	errors?: ParsedWhatsappStatusError[];
};

export type ParsedWhatsappStatusError = {
	code?: number;
	title?: string;
	message?: string;
	details?: string;
};

const WHATSAPP_STATUS_ERROR_MESSAGES: Record<number, string> = {
	4: "Limite temporário de chamadas à API do WhatsApp atingido. Tente novamente mais tarde.",
	10: "Permissão insuficiente para enviar a mensagem pelo WhatsApp.",
	100: "A mensagem foi recusada por parâmetro inválido na requisição ao WhatsApp.",
	368: "A conta ou número do WhatsApp foi temporariamente bloqueado por política da Meta.",
	130429: "Limite de envio do WhatsApp atingido. Tente novamente mais tarde.",
	131000: "Erro temporário do WhatsApp ao processar a mensagem.",
	131005: "Acesso negado ao recurso do WhatsApp usado para enviar a mensagem.",
	131008: "A mensagem foi recusada por falta de um parâmetro obrigatório.",
	131009: "A mensagem foi recusada por parâmetro inválido.",
	131016: "Serviço do WhatsApp temporariamente indisponível.",
	131021: "O número de destino não pode ser o mesmo número da empresa.",
	131026:
		"Mensagem não entregue pelo WhatsApp. O número pode não ter WhatsApp, estar indisponível, ter bloqueado a empresa, usar uma versão antiga do app ou a Meta pode ter bloqueado a entrega por qualidade.",
	131031: "Conta do WhatsApp Business bloqueada ou restrita pela Meta.",
	131042: "Mensagem não enviada por problema de elegibilidade ou pagamento da conta WhatsApp Business.",
	131047: "Mensagem fora da janela de atendimento de 24 horas. Use um template aprovado para retomar contato.",
	131048: "Limite de envio por qualidade/spam atingido. Reduza o volume e revise a qualidade das mensagens.",
	131049: "Mensagem não entregue pela Meta para manter uma experiência saudável para o usuário.",
	131051: "Tipo de mensagem não suportado para este destinatário ou pela Cloud API.",
	131052: "Falha ao baixar a mídia usada na mensagem.",
	131053: "Falha ao enviar a mídia usada na mensagem.",
	131056: "Limite de mensagens para este destinatário atingido. Tente novamente mais tarde.",
	131064: "Mensagem bloqueada por classificação, política ou limite relacionado ao template.",
	132000: "O template foi recusado porque os parâmetros enviados não correspondem ao modelo aprovado.",
	132001: "Template do WhatsApp não encontrado para o idioma ou nome informado.",
	132005: "Texto do template ficou grande demais após preencher os parâmetros.",
	132007: "Template contém caracteres ou conteúdo não permitido pela Meta.",
	132012: "Formato dos parâmetros do template não corresponde ao modelo aprovado.",
	132015: "Template pausado pela Meta por baixa qualidade.",
	132016: "Template desabilitado pela Meta por baixa qualidade.",
	133004: "Servidor do WhatsApp temporariamente indisponível.",
	133006: "Número do WhatsApp precisa ser verificado novamente.",
	133010: "Número do WhatsApp não registrado na Cloud API.",
	133016: "Limite de tentativas de registro do número atingido.",
	135000: "Erro genérico ao processar a mensagem no WhatsApp.",
};

function parseStatusErrors(status: Record<string, unknown>): ParsedWhatsappStatusError[] {
	const errors = status.errors as unknown[] | undefined;
	if (!Array.isArray(errors)) return [];

	return errors
		.map((error) => {
			const errorRecord = error && typeof error === "object" && !Array.isArray(error) ? (error as Record<string, unknown>) : null;
			if (!errorRecord) return null;

			const errorData =
				errorRecord.error_data && typeof errorRecord.error_data === "object" && !Array.isArray(errorRecord.error_data)
					? (errorRecord.error_data as Record<string, unknown>)
					: null;

			return {
				code: typeof errorRecord.code === "number" ? errorRecord.code : undefined,
				title: typeof errorRecord.title === "string" ? errorRecord.title : undefined,
				message: typeof errorRecord.message === "string" ? errorRecord.message : undefined,
				details: typeof errorData?.details === "string" ? errorData.details : undefined,
			};
		})
		.filter((error) => !!error);
}

export function getWhatsappStatusErrorMessage(errors: ParsedWhatsappStatusError[]): string | undefined {
	if (errors.length === 0) return undefined;

	const error = errors[0];
	const mappedMessage = error.code ? WHATSAPP_STATUS_ERROR_MESSAGES[error.code] : undefined;
	if (mappedMessage) return error.code ? `${mappedMessage} (Código ${error.code})` : mappedMessage;

	const fallbackMessage = error.details || error.message || error.title;
	if (!fallbackMessage && !error.code) return "Mensagem não entregue pelo WhatsApp.";
	if (!fallbackMessage) return `Mensagem não entregue pelo WhatsApp. Código ${error.code}.`;
	return error.code ? `${fallbackMessage} (Código ${error.code})` : fallbackMessage;
}

export function parseStatusUpdate(statusPayload: unknown): ParsedStatusUpdate | null {
	try {
		// Type assertion for webhook payload structure
		const payload = statusPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const value = change?.value as Record<string, unknown> | undefined;

		const statuses = value?.statuses as unknown[] | undefined;
		if (statuses && Array.isArray(statuses) && statuses.length > 0) {
			const status = statuses[0] as Record<string, unknown>;
			const errors = parseStatusErrors(status);
			return {
				whatsappMessageId: status.id as string,
				status: status.status as WhatsAppMessageStatus,
				timestamp: status.timestamp ? Number.parseInt(status.timestamp as string) * 1000 : Date.now(),
				errorMessage: getWhatsappStatusErrorMessage(errors),
				errors,
			};
		}

		return null;
	} catch (error) {
		console.error("[WHATSAPP_STATUS_PARSE_ERROR]", error);
		return null;
	}
}

type ParsedIncomingMessage = {
	whatsappPhoneNumberId: string;
	whatsappMessageId: string;
	fromPhoneNumber: string;
	profileName: string;
	messageType: "text" | "image" | "video" | "audio" | "document";
	textContent?: string;
	mediaId?: string;
	mimeType?: string;
	filename?: string;
	caption?: string;
	timestamp: number;
};

export function parseWebhookIncomingMessage(webhookPayload: unknown): ParsedIncomingMessage | null {
	try {
		// Type assertion for webhook payload structure
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const value = change?.value as Record<string, unknown> | undefined;

		// Check if this is a message event
		const messages = value?.messages as unknown[] | undefined;
		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return null;
		}

		const metadata = value?.metadata as Record<string, unknown> | undefined;
		const whatsappPhoneNumberId = metadata?.phone_number_id as string;
		const message = messages[0] as Record<string, unknown>;
		const contacts = value?.contacts as unknown[] | undefined;
		const contact = (Array.isArray(contacts) ? contacts[0] : undefined) as Record<string, unknown> | undefined;

		const profile = contact?.profile as Record<string, unknown> | undefined;
		const messageType = message.type as string;

		let textContent: string | undefined;
		let mediaId: string | undefined;
		let mimeType: string | undefined;
		let filename: string | undefined;
		let caption: string | undefined;

		// Handle different message types
		switch (messageType) {
			case "text": {
				const textObj = message.text as Record<string, unknown> | undefined;
				textContent = textObj?.body as string | undefined;
				break;
			}

			case "image": {
				const imageObj = message.image as Record<string, unknown> | undefined;
				mediaId = imageObj?.id as string | undefined;
				mimeType = imageObj?.mime_type as string | undefined;
				caption = imageObj?.caption as string | undefined;
				break;
			}

			case "document": {
				const documentObj = message.document as Record<string, unknown> | undefined;
				mediaId = documentObj?.id as string | undefined;
				mimeType = documentObj?.mime_type as string | undefined;
				filename = documentObj?.filename as string | undefined;
				caption = documentObj?.caption as string | undefined;
				break;
			}

			case "audio":
			case "video": {
				// For audio and video, we'll handle them similarly to documents for now
				const mediaObj = message[messageType] as Record<string, unknown> | undefined;
				mediaId = mediaObj?.id as string | undefined;
				mimeType = mediaObj?.mime_type as string | undefined;
				break;
			}

			default:
				console.log("[WHATSAPP_WEBHOOK] Unsupported message type received:", messageType);
				return null;
		}

		return {
			whatsappPhoneNumberId: whatsappPhoneNumberId || "",
			whatsappMessageId: message.id as string,
			fromPhoneNumber: formatWhatsappIdAsPhone(message.from as string),
			profileName: (profile?.name as string) || "Cliente",
			messageType: messageType as "text" | "image" | "video" | "audio" | "document",
			textContent,
			mediaId,
			mimeType,
			filename,
			caption,
			timestamp: message.timestamp ? Number.parseInt(message.timestamp as string) * 1000 : Date.now(),
		};
	} catch (error) {
		console.error("[WHATSAPP_MESSAGE_PARSE_ERROR]", error);
		return null;
	}
}

export function isStatusUpdate(webhookPayload: unknown): boolean {
	try {
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const value = change?.value as Record<string, unknown> | undefined;

		const statuses = value?.statuses as unknown[] | undefined;
		return !!(statuses && Array.isArray(statuses) && statuses.length > 0);
	} catch (error) {
		return false;
	}
}

export function isMessageEvent(webhookPayload: unknown): boolean {
	try {
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const value = change?.value as Record<string, unknown> | undefined;

		const messages = value?.messages as unknown[] | undefined;
		return !!(messages && Array.isArray(messages) && messages.length > 0);
	} catch (error) {
		return false;
	}
}

// Template Webhook Event Types
type WhatsAppTemplateStatus = "APPROVED" | "REJECTED" | "PENDING" | "DISABLED" | "PAUSED";
type WhatsAppTemplateQuality = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

type AppTemplateStatus = "RASCUNHO" | "PENDENTE" | "APROVADO" | "REJEITADO" | "PAUSADO" | "DESABILITADO";
type AppTemplateQuality = "PENDENTE" | "ALTA" | "MEDIA" | "BAIXA";

export function mapWhatsAppTemplateStatusToAppStatus(whatsappStatus: string): AppTemplateStatus {
	switch (whatsappStatus.toUpperCase()) {
		case "APPROVED":
			return "APROVADO";
		case "REJECTED":
			return "REJEITADO";
		case "PENDING":
			return "PENDENTE";
		case "DISABLED":
			return "DESABILITADO";
		case "PAUSED":
			return "PAUSADO";
		default:
			return "PENDENTE";
	}
}

export function mapWhatsAppTemplateQualityToAppQuality(whatsappQuality: string): AppTemplateQuality {
	switch (whatsappQuality.toUpperCase()) {
		case "GREEN":
		case "HIGH":
			return "ALTA";
		case "YELLOW":
		case "MEDIUM":
			return "MEDIA";
		case "RED":
		case "LOW":
			return "BAIXA";
		default:
			return "PENDENTE";
	}
}

type ParsedTemplateStatusUpdate = {
	event: string;
	messageTemplateId: string;
	messageTemplateName: string;
	messageTemplateLanguage: string;
	status?: AppTemplateStatus;
	reason?: string;
	timestamp: number;
};

type ParsedTemplateQualityUpdate = {
	event: string;
	messageTemplateId: string;
	messageTemplateName: string;
	messageTemplateLanguage: string;
	currentLimit?: string;
	quality?: AppTemplateQuality;
	previousQuality?: AppTemplateQuality;
	timestamp: number;
};

type ParsedTemplateCategoryUpdate = {
	event: string;
	messageTemplateId: string;
	messageTemplateName: string;
	messageTemplateLanguage: string;
	category?: string;
	previousCategory?: string;
	timestamp: number;
};

export function isTemplateEvent(webhookPayload: unknown): boolean {
	try {
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const field = change?.field as string | undefined;

		return field === "message_template_status_update" || field === "message_template_quality_update" || field === "template_category_update";
	} catch (error) {
		return false;
	}
}

export function parseTemplateStatusUpdate(webhookPayload: unknown): ParsedTemplateStatusUpdate | null {
	try {
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const value = change?.value as Record<string, unknown> | undefined;
		const field = change?.field as string | undefined;

		if (field !== "message_template_status_update") {
			return null;
		}

		// A Meta envia message_template_id como número no webhook, mas o idExterno é salvo como string na criação.
		// Normalizamos para string para que o matching com o idExterno salvo funcione.
		const messageTemplateId = value?.message_template_id != null ? String(value.message_template_id) : undefined;
		const messageTemplateName = value?.message_template_name as string | undefined;
		const messageTemplateLanguage = value?.message_template_language as string | undefined;
		const event = value?.event as string | undefined;

		if (!messageTemplateId || !messageTemplateName || !messageTemplateLanguage) {
			console.error("[WHATSAPP_TEMPLATE_STATUS_PARSE_ERROR] Missing required fields");
			return null;
		}

		// Get status and reason if this is an APPROVED or REJECTED event
		let status: AppTemplateStatus | undefined;
		let reason: string | undefined;

		if (event === "APPROVED") {
			status = "APROVADO";
		} else if (event === "REJECTED") {
			status = "REJEITADO";
			reason = value?.reason as string | undefined;
		} else if (event === "DISABLED") {
			status = "DESABILITADO";
			reason = value?.disable_info as string | undefined;
		} else if (event === "PAUSED") {
			status = "PAUSADO";
		}

		return {
			event: event || "UNKNOWN",
			messageTemplateId,
			messageTemplateName,
			messageTemplateLanguage,
			status,
			reason,
			timestamp: Date.now(),
		};
	} catch (error) {
		console.error("[WHATSAPP_TEMPLATE_STATUS_PARSE_ERROR]", error);
		return null;
	}
}

export function parseTemplateQualityUpdate(webhookPayload: unknown): ParsedTemplateQualityUpdate | null {
	try {
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const value = change?.value as Record<string, unknown> | undefined;
		const field = change?.field as string | undefined;

		if (field !== "message_template_quality_update") {
			return null;
		}

		// A Meta envia message_template_id como número no webhook, mas o idExterno é salvo como string na criação.
		// Normalizamos para string para que o matching com o idExterno salvo funcione.
		const messageTemplateId = value?.message_template_id != null ? String(value.message_template_id) : undefined;
		const messageTemplateName = value?.message_template_name as string | undefined;
		const messageTemplateLanguage = value?.message_template_language as string | undefined;
		const event = value?.event as string | undefined;

		if (!messageTemplateId || !messageTemplateName || !messageTemplateLanguage) {
			console.error("[WHATSAPP_TEMPLATE_QUALITY_PARSE_ERROR] Missing required fields");
			return null;
		}

		const currentLimit = value?.current_limit as string | undefined;
		const previousQualityRaw = value?.previous_quality as string | undefined;
		const newQualityRaw = value?.new_quality as string | undefined;

		const quality = newQualityRaw ? mapWhatsAppTemplateQualityToAppQuality(newQualityRaw) : undefined;
		const previousQuality = previousQualityRaw ? mapWhatsAppTemplateQualityToAppQuality(previousQualityRaw) : undefined;

		return {
			event: event || "QUALITY_UPDATE",
			messageTemplateId,
			messageTemplateName,
			messageTemplateLanguage,
			currentLimit,
			quality,
			previousQuality,
			timestamp: Date.now(),
		};
	} catch (error) {
		console.error("[WHATSAPP_TEMPLATE_QUALITY_PARSE_ERROR]", error);
		return null;
	}
}

export function parseTemplateCategoryUpdate(webhookPayload: unknown): ParsedTemplateCategoryUpdate | null {
	try {
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const value = change?.value as Record<string, unknown> | undefined;
		const field = change?.field as string | undefined;

		if (field !== "template_category_update") {
			return null;
		}

		// A Meta envia message_template_id como número no webhook, mas o idExterno é salvo como string na criação.
		// Normalizamos para string para que o matching com o idExterno salvo funcione.
		const messageTemplateId = value?.message_template_id != null ? String(value.message_template_id) : undefined;
		const messageTemplateName = value?.message_template_name as string | undefined;
		const messageTemplateLanguage = value?.message_template_language as string | undefined;
		const event = value?.event as string | undefined;

		if (!messageTemplateId || !messageTemplateName || !messageTemplateLanguage) {
			console.error("[WHATSAPP_TEMPLATE_CATEGORY_PARSE_ERROR] Missing required fields");
			return null;
		}

		const category = value?.category as string | undefined;
		const previousCategory = value?.previous_category as string | undefined;

		return {
			event: event || "CATEGORY_UPDATE",
			messageTemplateId,
			messageTemplateName,
			messageTemplateLanguage,
			category,
			previousCategory,
			timestamp: Date.now(),
		};
	} catch (error) {
		console.error("[WHATSAPP_TEMPLATE_CATEGORY_PARSE_ERROR]", error);
		return null;
	}
}

// SMB Message Echoes (WhatsApp Coexistence)
// These are messages sent from the WhatsApp Business phone app that are echoed to the webhook
type ParsedMessageEcho = {
	whatsappPhoneNumberId: string;
	whatsappMessageId: string;
	fromPhoneNumber: string; // Business phone number (sender)
	toPhoneNumber: string; // Client phone number (recipient)
	messageType: "text" | "image" | "video" | "audio" | "document";
	textContent?: string;
	mediaId?: string;
	mimeType?: string;
	filename?: string;
	caption?: string;
	timestamp: number;
};

export function isMessageEchoEvent(webhookPayload: unknown): boolean {
	try {
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const field = change?.field as string | undefined;

		return field === "smb_message_echoes";
	} catch (error) {
		return false;
	}
}

export function parseWebhookMessageEcho(webhookPayload: unknown): ParsedMessageEcho | null {
	try {
		const payload = webhookPayload as Record<string, unknown>;
		const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
		const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
		const value = change?.value as Record<string, unknown> | undefined;
		const field = change?.field as string | undefined;

		if (field !== "smb_message_echoes") {
			return null;
		}

		// Check if this is a message echo event
		const messageEchoes = value?.message_echoes as unknown[] | undefined;
		if (!messageEchoes || !Array.isArray(messageEchoes) || messageEchoes.length === 0) {
			return null;
		}

		const metadata = value?.metadata as Record<string, unknown> | undefined;
		const whatsappPhoneNumberId = metadata?.phone_number_id as string;
		const message = messageEchoes[0] as Record<string, unknown>;
		const messageType = message.type as string;

		let textContent: string | undefined;
		let mediaId: string | undefined;
		let mimeType: string | undefined;
		let filename: string | undefined;
		let caption: string | undefined;

		// Handle different message types
		switch (messageType) {
			case "text": {
				const textObj = message.text as Record<string, unknown> | undefined;
				textContent = textObj?.body as string | undefined;
				break;
			}

			case "image": {
				const imageObj = message.image as Record<string, unknown> | undefined;
				mediaId = imageObj?.id as string | undefined;
				mimeType = imageObj?.mime_type as string | undefined;
				caption = imageObj?.caption as string | undefined;
				break;
			}

			case "document": {
				const documentObj = message.document as Record<string, unknown> | undefined;
				mediaId = documentObj?.id as string | undefined;
				mimeType = documentObj?.mime_type as string | undefined;
				filename = documentObj?.filename as string | undefined;
				caption = documentObj?.caption as string | undefined;
				break;
			}

			case "audio":
			case "video": {
				const mediaObj = message[messageType] as Record<string, unknown> | undefined;
				mediaId = mediaObj?.id as string | undefined;
				mimeType = mediaObj?.mime_type as string | undefined;
				break;
			}

			default:
				console.log("[WHATSAPP_WEBHOOK] Unsupported message echo type received:", messageType);
				return null;
		}

		return {
			whatsappPhoneNumberId: whatsappPhoneNumberId || "",
			whatsappMessageId: message.id as string,
			fromPhoneNumber: formatWhatsappIdAsPhone(message.from as string),
			toPhoneNumber: formatWhatsappIdAsPhone(message.to as string),
			messageType: messageType as "text" | "image" | "video" | "audio" | "document",
			textContent,
			mediaId,
			mimeType,
			filename,
			caption,
			timestamp: message.timestamp ? Number.parseInt(message.timestamp as string) * 1000 : Date.now(),
		};
	} catch (error) {
		console.error("[WHATSAPP_MESSAGE_ECHO_PARSE_ERROR]", error);
		return null;
	}
}
