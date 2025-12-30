import { downloadAndStoreWhatsappMedia } from "@/lib/files-storage/chat-media";
import { formatPhoneAsBase } from "@/lib/formatting";
import {
	isMessageEchoEvent,
	isMessageEvent,
	isStatusUpdate,
	isTemplateEvent,
	mapWhatsAppStatusToAppStatus,
	parseStatusUpdate,
	parseTemplateCategoryUpdate,
	parseTemplateQualityUpdate,
	parseTemplateStatusUpdate,
	parseWebhookIncomingMessage,
	parseWebhookMessageEcho,
} from "@/lib/whatsapp/parsing";
import { db } from "@/services/drizzle";
import { chatMessages, chatServices, chats } from "@/services/drizzle/schema/chats";
import { clients } from "@/services/drizzle/schema/clients";
import { whatsappTemplates } from "@/services/drizzle/schema/whatsapp-templates";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

// Polyfill for waitUntil - in Vercel environment, this keeps the function running
// In non-Vercel environments, we just fire and forget
const waitUntil = (promise: Promise<unknown>): void => {
	promise.catch((error) => console.error("[WAIT_UNTIL] Background task error:", error));
};

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const AI_RESPONSE_DELAY_MS = 5000; // 5 seconds delay before AI response

type WebhookBody = {
	object: string;
	entry: Array<{
		id: string;
		changes: Array<{
			value: {
				messaging_product: string;
				metadata: {
					display_phone_number: string;
					phone_number_id: string;
				};
				contacts?: Array<{
					profile: { name: string };
					wa_id: string;
				}>;
				messages?: Array<unknown>;
				statuses?: Array<unknown>;
			};
			field: string;
		}>;
	}>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Webhook verification (GET request)
	if (req.method === "GET") {
		console.log("[INFO] [WHATSAPP_WEBHOOK] [VERIFY] Query received:", req.query);
		const mode = req.query["hub.mode"];
		const token = req.query["hub.verify_token"];
		const challenge = req.query["hub.challenge"];

		if (mode && token) {
			if (mode === "subscribe" && token === VERIFY_TOKEN) {
				console.log("WEBHOOK_VERIFIED");
				return res.status(200).send(challenge);
			}
			console.log("WEBHOOK_VERIFICATION_FAILED");
			return res.status(403).json({ error: "Verification failed" });
		}

		return res.status(400).json({ error: "Missing parameters" });
	}

	// Webhook events (POST request)
	if (req.method === "POST") {
		const body = req.body as WebhookBody;

		console.log("[INFO] [WHATSAPP_WEBHOOK] [POST] Incoming webhook message:", JSON.stringify(body, null, 2));

		if (body.object === "whatsapp_business_account") {
			// Return 200 immediately to acknowledge receipt (WhatsApp requires < 20s)
			res.status(200).json({ success: true });

			// Process webhook asynchronously using waitUntil
			waitUntil(processWebhookAsync(body));
			return;
		}

		return res.status(404).json({ error: "Event not supported" });
	}

	return res.status(405).json({ error: "Method not allowed" });
}

/**
 * Process webhook events asynchronously after returning 200 to WhatsApp
 */
async function processWebhookAsync(body: WebhookBody): Promise<void> {
	try {
		// Handle template events
		if (isTemplateEvent(body)) {
			await handleTemplateEvent(body);
		}

		// Handle status updates
		if (isStatusUpdate(body)) {
			await handleStatusUpdate(body);
		}
		// Handle incoming messages
		else if (isMessageEvent(body)) {
			await handleIncomingMessage(body);
		}
		// Handle message echoes (WhatsApp Coexistence)
		else if (isMessageEchoEvent(body)) {
			await handleMessageEcho(body);
		}
	} catch (error) {
		console.error("[WHATSAPP_WEBHOOK] Error processing webhook:", error);
	}
}

/**
 * Handle template status/quality/category updates
 */
async function handleTemplateEvent(body: WebhookBody): Promise<void> {
	const statusUpdate = parseTemplateStatusUpdate(body);
	if (statusUpdate?.status) {
		console.log("[WHATSAPP_WEBHOOK] Template status update:", statusUpdate);
		await db
			.update(whatsappTemplates)
			.set({
				status: statusUpdate.status,
				...(statusUpdate.reason && { rejeicao: statusUpdate.reason }),
			})
			.where(eq(whatsappTemplates.whatsappTemplateId, statusUpdate.messageTemplateId));
	}

	const qualityUpdate = parseTemplateQualityUpdate(body);
	if (qualityUpdate?.quality) {
		console.log("[WHATSAPP_WEBHOOK] Template quality update:", qualityUpdate);
		await db
			.update(whatsappTemplates)
			.set({ qualidade: qualityUpdate.quality })
			.where(eq(whatsappTemplates.whatsappTemplateId, qualityUpdate.messageTemplateId));
	}

	const categoryUpdate = parseTemplateCategoryUpdate(body);
	if (categoryUpdate?.category) {
		console.log("[WHATSAPP_WEBHOOK] Template category update:", categoryUpdate);
		const CATEGORY_MAP: Record<string, "AUTENTICAÇÃO" | "MARKETING" | "UTILIDADE"> = {
			authentication: "AUTENTICAÇÃO",
			marketing: "MARKETING",
			utility: "UTILIDADE",
		};
		const normalizedCategory = categoryUpdate.category.toLowerCase();
		if (CATEGORY_MAP[normalizedCategory]) {
			await db
				.update(whatsappTemplates)
				.set({ categoria: CATEGORY_MAP[normalizedCategory] })
				.where(eq(whatsappTemplates.whatsappTemplateId, categoryUpdate.messageTemplateId));
		}
	}
}

/**
 * Handle message status updates (sent, delivered, read, failed)
 */
async function handleStatusUpdate(body: WebhookBody): Promise<void> {
	const statusUpdate = parseStatusUpdate(body);
	if (!statusUpdate) return;

	const { status, whatsappStatus } = mapWhatsAppStatusToAppStatus(statusUpdate.status);

	await db
		.update(chatMessages)
		.set({ status, whatsappMessageStatus: whatsappStatus })
		.where(eq(chatMessages.whatsappMessageId, statusUpdate.whatsappMessageId));

	console.log("[WHATSAPP_WEBHOOK] Status updated for message:", statusUpdate.whatsappMessageId);
}

/**
 * Handle incoming messages from clients
 */
async function handleIncomingMessage(body: WebhookBody): Promise<void> {
	const incomingMessage = parseWebhookIncomingMessage(body);
	if (!incomingMessage) {
		console.error("[WHATSAPP_WEBHOOK] Failed to parse incoming message");
		return;
	}

	// Find WhatsApp connection by phone number ID
	const connectionPhone = await db.query.whatsappConnectionPhones.findFirst({
		where: (fields, { eq }) => eq(fields.whatsappTelefoneId, incomingMessage.whatsappPhoneNumberId),
		with: {
			conexao: true,
		},
	});

	if (!connectionPhone?.conexao) {
		console.warn("[WHATSAPP_WEBHOOK] No WhatsApp connection found for:", incomingMessage.whatsappPhoneNumberId);
		return;
	}

	const organizacaoId = connectionPhone.conexao.organizacaoId;
	const whatsappToken = connectionPhone.conexao.token;
	const whatsappConexaoId = connectionPhone.conexaoId;
	const whatsappConexaoTelefoneId = connectionPhone.id;

	// Find or create client
	let clientId: string | null = null;
	const phoneBase = formatPhoneAsBase(incomingMessage.fromPhoneNumber);

	const existingClient = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.telefoneBase, phoneBase), eq(fields.organizacaoId, organizacaoId)),
	});

	if (existingClient) {
		clientId = existingClient.id;
	} else {
		const [newClient] = await db
			.insert(clients)
			.values({
				organizacaoId,
				nome: incomingMessage.profileName,
				telefone: incomingMessage.fromPhoneNumber,
				telefoneBase: phoneBase,
				canalAquisicao: "WHATSAPP",
			})
			.returning({ id: clients.id });
		clientId = newClient.id;
		console.log("[WHATSAPP_WEBHOOK] New client created:", clientId);
	}

	if (!clientId) {
		console.warn("[WHATSAPP_WEBHOOK] Cannot process message without client ID");
		return;
	}

	// Find or create chat
	let chatId: string | null = null;
	const existingChat = await db.query.chats.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.organizacaoId, organizacaoId), eq(fields.clienteId, clientId), eq(fields.whatsappTelefoneId, incomingMessage.whatsappPhoneNumberId)),
	});

	if (existingChat) {
		chatId = existingChat.id;
	} else {
		const [newChat] = await db
			.insert(chats)
			.values({
				organizacaoId,
				clienteId: clientId,
				whatsappConexaoId,
				whatsappConexaoTelefoneId,
				whatsappTelefoneId: incomingMessage.whatsappPhoneNumberId,
				mensagensNaoLidas: 0,
				ultimaMensagemData: new Date(),
				ultimaMensagemConteudoTipo: "TEXTO",
				status: "ABERTA",
			})
			.returning({ id: chats.id });
		chatId = newChat.id;
		console.log("[WHATSAPP_WEBHOOK] New chat created:", chatId);
	}

	// Find or create service
	let serviceId: string | null = null;
	let serviceResponsibleType: "AI" | "USUÁRIO" | "BUSINESS-APP" | "CLIENTE" = "AI";

	const existingService = await db.query.chatServices.findFirst({
		where: (fields, { and, eq, or }) => and(eq(fields.chatId, chatId), or(eq(fields.status, "PENDENTE"), eq(fields.status, "EM_ANDAMENTO"))),
	});

	if (existingService) {
		serviceId = existingService.id;
		serviceResponsibleType = existingService.responsavelTipo;
	} else {
		const [newService] = await db
			.insert(chatServices)
			.values({
				organizacaoId,
				chatId,
				clienteId: clientId,
				responsavelTipo: "AI",
				descricao: "NÃO ESPECIFICADO",
				status: "PENDENTE",
			})
			.returning({ id: chatServices.id });
		serviceId = newService.id;
	}

	// Download and store media if present
	let mediaData: {
		storageId: string;
		publicUrl: string;
		mimeType: string;
		fileSize: number;
	} | null = null;

	if (incomingMessage.mediaId && incomingMessage.mimeType) {
		try {
			mediaData = await downloadAndStoreWhatsappMedia({
				mediaId: incomingMessage.mediaId,
				mimeType: incomingMessage.mimeType,
				filename: incomingMessage.filename,
				organizacaoId,
				chatId,
				whatsappToken,
			});
			console.log("[WHATSAPP_WEBHOOK] Media stored:", mediaData.storageId);
		} catch (error) {
			console.error("[WHATSAPP_WEBHOOK] Error downloading media:", error);
		}
	}

	// Determine media type
	let midiaTipo: "TEXTO" | "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO" = "TEXTO";
	if (incomingMessage.messageType === "image") midiaTipo = "IMAGEM";
	else if (incomingMessage.messageType === "document") midiaTipo = "DOCUMENTO";
	else if (incomingMessage.messageType === "video") midiaTipo = "VIDEO";
	else if (incomingMessage.messageType === "audio") midiaTipo = "AUDIO";

	// Insert message
	const [insertedMessage] = await db
		.insert(chatMessages)
		.values({
			organizacaoId,
			chatId,
			autorTipo: "CLIENTE",
			autorClienteId: clientId,
			conteudoTexto: incomingMessage.textContent || incomingMessage.caption || "",
			conteudoMidiaTipo: midiaTipo,
			conteudoMidiaUrl: mediaData?.publicUrl,
			conteudoMidiaStorageId: mediaData?.storageId,
			conteudoMidiaMimeType: mediaData?.mimeType,
			conteudoMidiaArquivoTamanho: mediaData?.fileSize,
			conteudoMidiaWhatsappId: incomingMessage.mediaId,
			status: "RECEBIDO",
			whatsappMessageId: incomingMessage.whatsappMessageId,
			whatsappMessageStatus: "ENTREGUE",
			servicoId: serviceId,
		})
		.returning({ id: chatMessages.id, dataEnvio: chatMessages.dataEnvio });

	// Update chat
	const aiScheduleTime = new Date(Date.now() + AI_RESPONSE_DELAY_MS);
	await db
		.update(chats)
		.set({
			ultimaMensagemId: insertedMessage.id,
			ultimaMensagemData: insertedMessage.dataEnvio,
			ultimaMensagemConteudoTexto: incomingMessage.textContent || incomingMessage.caption,
			ultimaMensagemConteudoTipo: midiaTipo,
			mensagensNaoLidas: existingChat ? existingChat.mensagensNaoLidas + 1 : 1,
			ultimaInteracaoClienteData: new Date(),
			aiAgendamentoRespostaData: serviceResponsibleType === "AI" ? aiScheduleTime : null,
			status: "ABERTA",
		})
		.where(eq(chats.id, chatId));

	console.log("[WHATSAPP_WEBHOOK] Message created from:", incomingMessage.fromPhoneNumber);

	// Schedule AI response if responsible is AI
	if (serviceResponsibleType === "AI") {
		waitUntil(scheduleAIResponse(chatId, organizacaoId, aiScheduleTime));
	}

	// Process media with AI if present
	if (mediaData && midiaTipo !== "TEXTO") {
		waitUntil(processMediaWithAI(insertedMessage.id, mediaData, midiaTipo));
	}
}

/**
 * Handle message echoes from WhatsApp Business phone app (Coexistence)
 */
async function handleMessageEcho(body: WebhookBody): Promise<void> {
	const messageEcho = parseWebhookMessageEcho(body);
	if (!messageEcho) {
		console.error("[WHATSAPP_WEBHOOK] Failed to parse message echo");
		return;
	}

	// Find WhatsApp connection
	const connectionPhone = await db.query.whatsappConnectionPhones.findFirst({
		where: (fields, { eq }) => eq(fields.whatsappTelefoneId, messageEcho.whatsappPhoneNumberId),
		with: {
			conexao: true,
		},
	});

	if (!connectionPhone?.conexao) {
		console.warn("[WHATSAPP_WEBHOOK] [ECHO] No WhatsApp connection found");
		return;
	}

	const organizacaoId = connectionPhone.conexao.organizacaoId;
	const whatsappToken = connectionPhone.conexao.token;
	const whatsappConexaoId = connectionPhone.conexaoId;
	const whatsappConexaoTelefoneId = connectionPhone.id;

	// Find or create client (recipient)
	const phoneBase = formatPhoneAsBase(messageEcho.toPhoneNumber);
	let clientId: string | null = null;

	const existingClient = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.telefoneBase, phoneBase), eq(fields.organizacaoId, organizacaoId)),
	});

	if (existingClient) {
		clientId = existingClient.id;
	} else {
		const [newClient] = await db
			.insert(clients)
			.values({
				organizacaoId,
				nome: messageEcho.toPhoneNumber,
				telefone: messageEcho.toPhoneNumber,
				telefoneBase: phoneBase,
				canalAquisicao: "WHATSAPP",
			})
			.returning({ id: clients.id });
		clientId = newClient.id;
	}

	if (!clientId) return;

	// Find or create chat
	let chatId: string | null = null;
	const existingChat = await db.query.chats.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.clienteId, clientId), eq(fields.whatsappTelefoneId, messageEcho.whatsappPhoneNumberId)),
	});

	if (existingChat) {
		chatId = existingChat.id;
	} else {
		const [newChat] = await db
			.insert(chats)
			.values({
				organizacaoId,
				clienteId: clientId,
				whatsappConexaoId,
				whatsappConexaoTelefoneId,
				whatsappTelefoneId: messageEcho.whatsappPhoneNumberId,
				mensagensNaoLidas: 0,
				ultimaMensagemData: new Date(),
				ultimaMensagemConteudoTipo: "TEXTO",
				status: "ABERTA",
			})
			.returning({ id: chats.id });
		chatId = newChat.id;
	}

	// Find or create service (mark as BUSINESS-APP handling)
	let serviceId: string | null = null;
	const existingService = await db.query.chatServices.findFirst({
		where: (fields, { and, eq, or }) => and(eq(fields.chatId, chatId), or(eq(fields.status, "PENDENTE"), eq(fields.status, "EM_ANDAMENTO"))),
	});

	if (existingService) {
		serviceId = existingService.id;
		if (existingService.responsavelTipo === "AI") {
			await db.update(chatServices).set({ responsavelTipo: "BUSINESS-APP" }).where(eq(chatServices.id, serviceId));
		}
	} else {
		const [newService] = await db
			.insert(chatServices)
			.values({
				organizacaoId,
				chatId,
				clienteId: clientId,
				responsavelTipo: "BUSINESS-APP",
				descricao: "NÃO ESPECIFICADO",
				status: "EM_ANDAMENTO",
			})
			.returning({ id: chatServices.id });
		serviceId = newService.id;
	}

	// Download and store media if present
	let mediaData: {
		storageId: string;
		publicUrl: string;
		mimeType: string;
		fileSize: number;
	} | null = null;

	if (messageEcho.mediaId && messageEcho.mimeType) {
		try {
			mediaData = await downloadAndStoreWhatsappMedia({
				mediaId: messageEcho.mediaId,
				mimeType: messageEcho.mimeType,
				filename: messageEcho.filename,
				organizacaoId,
				chatId,
				whatsappToken,
			});
		} catch (error) {
			console.error("[WHATSAPP_WEBHOOK] [ECHO] Error downloading media:", error);
		}
	}

	// Determine media type
	let midiaTipo: "TEXTO" | "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO" = "TEXTO";
	if (messageEcho.messageType === "image") midiaTipo = "IMAGEM";
	else if (messageEcho.messageType === "document") midiaTipo = "DOCUMENTO";
	else if (messageEcho.messageType === "video") midiaTipo = "VIDEO";
	else if (messageEcho.messageType === "audio") midiaTipo = "AUDIO";

	// Insert message
	const [insertedMessage] = await db
		.insert(chatMessages)
		.values({
			organizacaoId,
			chatId,
			autorTipo: "BUSINESS-APP",
			conteudoTexto: messageEcho.textContent || messageEcho.caption || "",
			conteudoMidiaTipo: midiaTipo,
			conteudoMidiaUrl: mediaData?.publicUrl,
			conteudoMidiaStorageId: mediaData?.storageId,
			conteudoMidiaMimeType: mediaData?.mimeType,
			conteudoMidiaArquivoTamanho: mediaData?.fileSize,
			conteudoMidiaWhatsappId: messageEcho.mediaId,
			status: "ENVIADO",
			whatsappMessageId: messageEcho.whatsappMessageId,
			whatsappMessageStatus: "ENVIADO",
			servicoId: serviceId,
			isEcho: true,
		})
		.returning({ id: chatMessages.id, dataEnvio: chatMessages.dataEnvio });

	// Update chat
	await db
		.update(chats)
		.set({
			ultimaMensagemId: insertedMessage.id,
			ultimaMensagemData: insertedMessage.dataEnvio,
			ultimaMensagemConteudoTexto: messageEcho.textContent || messageEcho.caption,
			ultimaMensagemConteudoTipo: midiaTipo,
			status: "ABERTA",
		})
		.where(eq(chats.id, chatId));

	console.log("[WHATSAPP_WEBHOOK] [ECHO] Message echo created to:", messageEcho.toPhoneNumber);
}

/**
 * Schedule AI response with delay and verification
 */
async function scheduleAIResponse(chatId: string, organizacaoId: string, scheduledAt: Date): Promise<void> {
	// Wait for the delay
	const delayMs = scheduledAt.getTime() - Date.now();
	if (delayMs > 0) {
		await new Promise((resolve) => setTimeout(resolve, delayMs));
	}

	// Check if new messages arrived after scheduling
	const chat = await db.query.chats.findFirst({
		where: (fields, { eq }) => eq(fields.id, chatId),
	});

	if (!chat) {
		console.log("[AI_RESPONSE] Chat not found:", chatId);
		return;
	}

	// If the scheduled time doesn't match, a newer message has reset the timer
	if (chat.aiAgendamentoRespostaData && chat.aiAgendamentoRespostaData.getTime() !== scheduledAt.getTime()) {
		console.log("[AI_RESPONSE] Skipping - newer message arrived:", chatId);
		return;
	}

	// Check if service is still AI-handled
	const service = await db.query.chatServices.findFirst({
		where: (fields, { and, eq, or }) => and(eq(fields.chatId, chatId), or(eq(fields.status, "PENDENTE"), eq(fields.status, "EM_ANDAMENTO"))),
	});

	if (!service || service.responsavelTipo !== "AI") {
		console.log("[AI_RESPONSE] Skipping - service not AI-handled:", chatId);
		return;
	}

	// Generate and send AI response
	try {
		const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const response = await fetch(`${APP_URL}/api/integrations/ai/generate-response`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chatId }),
		});

		if (!response.ok) {
			throw new Error(`AI response generation failed: ${response.status}`);
		}

		const result = await response.json();
		if (result.success && result.message) {
			// Create AI message in database
			await createAIMessage(chatId, organizacaoId, result.message, result.metadata);
		}
	} catch (error) {
		console.error("[AI_RESPONSE] Error generating response:", error);
	}
}

/**
 * Create AI message and send via WhatsApp
 */
async function createAIMessage(
	chatId: string,
	organizacaoId: string,
	content: string,
	metadata?: { serviceDescription?: string; escalation?: { applicable: boolean; reason?: string } },
): Promise<void> {
	const chat = await db.query.chats.findFirst({
		where: (fields, { eq }) => eq(fields.id, chatId),
		with: {
			cliente: true,
			whatsappConexao: { columns: { token: true } },
		},
	});

	if (!chat || chat.status !== "ABERTA") {
		console.log("[AI_MESSAGE] Cannot send - chat closed or not found");
		return;
	}

	// Get or update service
	const service = await db.query.chatServices.findFirst({
		where: (fields, { and, eq, or }) => and(eq(fields.chatId, chatId), or(eq(fields.status, "PENDENTE"), eq(fields.status, "EM_ANDAMENTO"))),
	});

	const serviceId = service?.id;

	if (service && metadata?.serviceDescription) {
		await db
			.update(chatServices)
			.set({
				descricao: metadata.serviceDescription,
				...(metadata.escalation?.applicable && { responsavelTipo: "USUÁRIO" as const }),
			})
			.where(eq(chatServices.id, service.id));
	}

	// Insert AI message
	const [insertedMessage] = await db
		.insert(chatMessages)
		.values({
			organizacaoId,
			chatId,
			autorTipo: "AI",
			conteudoTexto: content,
			conteudoMidiaTipo: "TEXTO",
			status: "ENVIADO",
			whatsappMessageStatus: "PENDENTE",
			servicoId: serviceId,
		})
		.returning({ id: chatMessages.id, dataEnvio: chatMessages.dataEnvio });

	// Update chat
	await db
		.update(chats)
		.set({
			ultimaMensagemId: insertedMessage.id,
			ultimaMensagemData: insertedMessage.dataEnvio,
			ultimaMensagemConteudoTexto: content,
			ultimaMensagemConteudoTipo: "TEXTO",
		})
		.where(eq(chats.id, chatId));

	// Send via WhatsApp
	if (chat.whatsappConexao?.token && chat.cliente?.telefone) {
		try {
			const { sendBasicWhatsappMessage } = await import("@/lib/whatsapp");
			const response = await sendBasicWhatsappMessage({
				fromPhoneNumberId: chat.whatsappTelefoneId,
				toPhoneNumber: chat.cliente.telefone,
				content,
				whatsappToken: chat.whatsappConexao.token,
			});

			await db
				.update(chatMessages)
				.set({
					whatsappMessageId: response.whatsappMessageId,
					whatsappMessageStatus: "ENVIADO",
				})
				.where(eq(chatMessages.id, insertedMessage.id));

			console.log("[AI_MESSAGE] Sent successfully:", insertedMessage.id);
		} catch (error) {
			console.error("[AI_MESSAGE] Send failed:", error);
			await db.update(chatMessages).set({ whatsappMessageStatus: "FALHOU" }).where(eq(chatMessages.id, insertedMessage.id));
		}
	}
}

/**
 * Process media with AI (transcription, image analysis, etc.)
 */
async function processMediaWithAI(
	messageId: string,
	mediaData: { storageId: string; mimeType: string },
	mediaType: "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO",
): Promise<void> {
	try {
		const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const response = await fetch(`${APP_URL}/api/integrations/ai/process-media`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messageId,
				storageId: mediaData.storageId,
				mimeType: mediaData.mimeType,
				mediaType,
			}),
		});

		if (!response.ok) {
			throw new Error(`Media processing failed: ${response.status}`);
		}

		const result = await response.json();
		if (result.success) {
			await db
				.update(chatMessages)
				.set({
					conteudoMidiaTextoProcessado: result.processedText,
					conteudoMidiaTextoProcessadoResumo: result.summary,
				})
				.where(eq(chatMessages.id, messageId));

			console.log("[MEDIA_PROCESSING] Completed for message:", messageId);
		}
	} catch (error) {
		console.error("[MEDIA_PROCESSING] Error:", error);
	}
}
