import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { SUPABASE_STORAGE_CHAT_MEDIA_BUCKET, getChatMediaUrl } from "@/lib/files-storage/chat-media";
import { sendBasicWhatsappMessage, sendMediaWhatsappMessage, sendTemplateWhatsappMessage, uploadMediaToWhatsapp } from "@/lib/whatsapp";
import { formatPhoneAsWhatsappId } from "@/lib/whatsapp/utils";
import { db } from "@/services/drizzle";
import { chatMessages, chats } from "@/services/drizzle/schema/chats";
import { supabaseClient } from "@/services/supabase";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= POST - Send message via WhatsApp =============

const sendWhatsappTextSchema = z.object({
	type: z.literal("text"),
	messageId: z.string(),
	chatId: z.string(),
});

const sendWhatsappMediaSchema = z.object({
	type: z.literal("media"),
	messageId: z.string(),
	chatId: z.string(),
	storageId: z.string(),
	mediaType: z.enum(["IMAGEM", "VIDEO", "AUDIO", "DOCUMENTO"]),
	mimeType: z.string(),
	filename: z.string().optional(),
	caption: z.string().optional(),
});

const sendWhatsappTemplateSchema = z.object({
	type: z.literal("template"),
	messageId: z.string(),
	chatId: z.string(),
	templatePayload: z.any(),
});

const sendWhatsappBodySchema = z.discriminatedUnion("type", [sendWhatsappTextSchema, sendWhatsappMediaSchema, sendWhatsappTemplateSchema]);

export type TSendWhatsappInput = z.infer<typeof sendWhatsappBodySchema>;

async function sendWhatsappMessage({ session, input }: { session: TAuthUserSession["user"]; input: TSendWhatsappInput }) {
	const organizacaoId = session.organizacaoId;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Get message
	const message = await db.query.chatMessages.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.messageId), eq(fields.organizacaoId, organizacaoId)),
	});

	if (!message) {
		throw new createHttpError.NotFound("Mensagem não encontrada.");
	}

	// Get chat with client and connection
	const chat = await db.query.chats.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.chatId), eq(fields.organizacaoId, organizacaoId)),
		with: {
			cliente: true,
			whatsappConexao: {
				columns: {
					token: true,
				},
			},
		},
	});

	if (!chat) {
		throw new createHttpError.NotFound("Chat não encontrado.");
	}

	if (!chat.whatsappConexao?.token) {
		throw new createHttpError.BadRequest("Conexão WhatsApp não configurada.");
	}

	if (!chat.cliente?.telefone) {
		throw new createHttpError.BadRequest("Cliente não possui telefone cadastrado.");
	}

	// Check if conversation is open (24h window)
	if (chat.status !== "ABERTA" && input.type !== "template") {
		throw new createHttpError.BadRequest("Conversa expirada. Envie um template para reabrir.");
	}

	const whatsappToken = chat.whatsappConexao.token;
	const clientPhone = chat.cliente.telefone;
	const fromPhoneNumberId = chat.whatsappTelefoneId;

	let whatsappMessageId: string | null = null;

	try {
		if (input.type === "text") {
			// Send text message
			if (!message.conteudoTexto) {
				throw new createHttpError.BadRequest("Mensagem não possui conteúdo de texto.");
			}

			const response = await sendBasicWhatsappMessage({
				fromPhoneNumberId,
				toPhoneNumber: formatPhoneAsWhatsappId(clientPhone),
				content: message.conteudoTexto,
				whatsappToken,
			});

			whatsappMessageId = response.whatsappMessageId;
		} else if (input.type === "media") {
			if (!message.conteudoMidiaStorageId) {
				throw new createHttpError.BadRequest("Mensagem não possui storage ID do arquivo.");
			}

			console.log("[SEND_WHATSAPP] Downloading file from Supabase Storage:", {
				mediaUrl: message.conteudoMidiaUrl,
				mediaStorageId: message.conteudoMidiaStorageId,
			});
			// Download file from Supabase Storage
			const { data: fileData, error: downloadError } = await supabaseClient.storage
				.from(SUPABASE_STORAGE_CHAT_MEDIA_BUCKET)
				.download(message.conteudoMidiaStorageId);

			if (downloadError || !fileData) {
				throw new createHttpError.InternalServerError("Erro ao baixar arquivo do storage.");
			}

			const fileBuffer = Buffer.from(await fileData.arrayBuffer());

			// Upload to WhatsApp
			const uploadResponse = await uploadMediaToWhatsapp({
				fromPhoneNumberId,
				fileBuffer,
				mimeType: input.mimeType,
				filename: input.filename || "arquivo",
				whatsappToken,
			});

			// Determine WhatsApp media type
			let whatsappMediaType: "image" | "document" | "audio" = "document";
			if (input.mediaType === "IMAGEM") {
				whatsappMediaType = "image";
			} else if (input.mediaType === "AUDIO") {
				whatsappMediaType = "audio";
			}

			// Send media message
			const response = await sendMediaWhatsappMessage({
				fromPhoneNumberId,
				toPhoneNumber: formatPhoneAsWhatsappId(clientPhone),
				mediaId: uploadResponse.mediaId,
				mediaType: whatsappMediaType,
				caption: input.caption,
				filename: input.filename,
				whatsappToken,
			});

			whatsappMessageId = response.whatsappMessageId;
		} else if (input.type === "template") {
			// Send template message
			const response = await sendTemplateWhatsappMessage({
				fromPhoneNumberId,
				templatePayload: input.templatePayload,
				whatsappToken,
			});

			whatsappMessageId = response.whatsappMessageId;

			// Reopen conversation after template
			await db
				.update(chats)
				.set({
					status: "ABERTA",
					ultimaInteracaoClienteData: new Date(),
				})
				.where(eq(chats.id, input.chatId));
		}

		// Update message with WhatsApp ID and status
		await db
			.update(chatMessages)
			.set({
				whatsappMessageId,
				whatsappMessageStatus: "ENVIADO",
			})
			.where(eq(chatMessages.id, input.messageId));

		return {
			data: {
				messageId: input.messageId,
				whatsappMessageId,
				status: "ENVIADO",
			},
			message: "Mensagem enviada via WhatsApp com sucesso.",
		};
	} catch (error) {
		console.error("[SEND_WHATSAPP] Error:", error);

		// Mark message as failed
		await db
			.update(chatMessages)
			.set({
				whatsappMessageStatus: "FALHOU",
			})
			.where(eq(chatMessages.id, input.messageId));

		throw error;
	}
}

export type TSendWhatsappOutput = Awaited<ReturnType<typeof sendWhatsappMessage>>;

async function sendWhatsappRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const body = await req.json();
	const input = sendWhatsappBodySchema.parse(body);

	const result = await sendWhatsappMessage({ session: session.user, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= POST - Retry failed message =============

const retryMessageBodySchema = z.object({
	messageId: z.string(),
});

export type TRetryMessageInput = z.infer<typeof retryMessageBodySchema>;

async function retryMessage({ session, input }: { session: TAuthUserSession["user"]; input: TRetryMessageInput }) {
	const organizacaoId = session.organizacaoId;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Get message with chat info
	const message = await db.query.chatMessages.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.messageId), eq(fields.organizacaoId, organizacaoId)),
		with: {
			chat: {
				with: {
					cliente: true,
					whatsappConexao: {
						columns: {
							token: true,
						},
					},
				},
			},
		},
	});

	if (!message) {
		throw new createHttpError.NotFound("Mensagem não encontrada.");
	}

	if (message.whatsappMessageStatus !== "FALHOU") {
		throw new createHttpError.BadRequest("Apenas mensagens com falha podem ser reenviadas.");
	}

	// Reset status to pending
	await db.update(chatMessages).set({ whatsappMessageStatus: "PENDENTE" }).where(eq(chatMessages.id, input.messageId));

	// Prepare send input based on message type
	let sendInput: TSendWhatsappInput;

	if (message.conteudoMidiaStorageId && message.conteudoMidiaTipo !== "TEXTO") {
		sendInput = {
			type: "media",
			messageId: input.messageId,
			chatId: message.chatId,
			storageId: message.conteudoMidiaStorageId,
			mediaType: message.conteudoMidiaTipo as "IMAGEM" | "VIDEO" | "AUDIO" | "DOCUMENTO",
			mimeType: message.conteudoMidiaMimeType || "application/octet-stream",
			filename: message.conteudoMidiaArquivoNome || undefined,
			caption: message.conteudoTexto || undefined,
		};
	} else {
		sendInput = {
			type: "text",
			messageId: input.messageId,
			chatId: message.chatId,
		};
	}

	return sendWhatsappMessage({ session, input: sendInput });
}

export type TRetryMessageOutput = Awaited<ReturnType<typeof retryMessage>>;

// ============= Export handlers =============

export const POST = appApiHandler({
	POST: sendWhatsappRoute,
});
