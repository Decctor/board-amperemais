import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getChatMediaUrl, uploadChatMedia } from "@/lib/files-storage/chat-media";
import { db } from "@/services/drizzle";
import { chatMessages, chatServices, chats } from "@/services/drizzle/schema/chats";
import { and, desc, eq, lt, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= GET - Get paginated messages for a chat =============

const getMessagesQuerySchema = z.object({
	chatId: z.string(),
	cursor: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(50),
});

export type TGetMessagesInput = z.infer<typeof getMessagesQuerySchema>;

async function getMessages({ session, input }: { session: TAuthUserSession; input: TGetMessagesInput }) {
	const { chatId, cursor, limit } = input;
	const organizacaoId = session.membership?.organizacao.id;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Verify chat belongs to organization
	const chat = await db.query.chats.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, chatId), eq(fields.organizacaoId, organizacaoId)),
	});

	if (!chat) {
		throw new createHttpError.NotFound("Chat não encontrado.");
	}

	// Parse cursor (format: "timestamp_id")
	let cursorTimestamp: Date | null = null;
	let cursorId: string | null = null;
	if (cursor) {
		const [timestampStr, id] = cursor.split("_");
		cursorTimestamp = new Date(Number.parseInt(timestampStr, 10));
		cursorId = id;
	}

	// Build query for messages (reverse chronological order)
	const messages = await db.query.chatMessages.findMany({
		where: (fields, { and, eq, lt, or }) =>
			and(
				eq(fields.chatId, chatId),
				cursorTimestamp && cursorId
					? or(lt(fields.dataEnvio, cursorTimestamp), and(eq(fields.dataEnvio, cursorTimestamp), lt(fields.id, cursorId)))
					: undefined,
			),
		orderBy: (fields, { desc }) => [desc(fields.dataEnvio), desc(fields.id)],
		limit: limit + 1,
		with: {
			autorUsuario: {
				columns: {
					id: true,
					nome: true,
					avatarUrl: true,
				},
			},
			autorCliente: {
				columns: {
					id: true,
					nome: true,
				},
			},
		},
	});

	// Check if there are more results
	const hasMore = messages.length > limit;
	const pageMessages = hasMore ? messages.slice(0, limit) : messages;

	// Enrich messages with author data
	const enrichedMessages = pageMessages.map((message) => {
		let autor: { nome: string; avatarUrl?: string | null } | null = null;

		switch (message.autorTipo) {
			case "CLIENTE":
				autor = message.autorCliente ? { nome: message.autorCliente.nome } : null;
				break;
			case "USUÁRIO":
				autor = message.autorUsuario ? { nome: message.autorUsuario.nome, avatarUrl: message.autorUsuario.avatarUrl } : null;
				break;
			case "AI":
				autor = { nome: "Assistente IA" };
				break;
			case "BUSINESS-APP":
				autor = { nome: "Telefone" };
				break;
		}

		// Get public URL for media if exists
		const mediaUrl = message.conteudoMidiaStorageId ? getChatMediaUrl(message.conteudoMidiaStorageId) : message.conteudoMidiaUrl;

		return {
			...message,
			autor,
			conteudoMidiaUrl: mediaUrl,
		};
	});

	// Reverse to show oldest first (for display)
	enrichedMessages.reverse();

	// Create next cursor from the oldest message (before reversing)
	let nextCursor: string | null = null;
	if (hasMore && pageMessages.length > 0) {
		const oldestMessage = pageMessages[pageMessages.length - 1];
		nextCursor = `${oldestMessage.dataEnvio.getTime()}_${oldestMessage.id}`;
	}

	return {
		data: {
			items: enrichedMessages,
			hasMore,
			nextCursor,
		},
		message: "Mensagens carregadas com sucesso.",
	};
}

export type TGetMessagesOutput = Awaited<ReturnType<typeof getMessages>>;

async function getMessagesRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const searchParams = req.nextUrl.searchParams;
	const input = getMessagesQuerySchema.parse({
		chatId: searchParams.get("chatId"),
		cursor: searchParams.get("cursor") || undefined,
		limit: searchParams.get("limit") || 50,
	});

	const result = await getMessages({ session, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= POST - Create a new message =============

const createMessageBodySchema = z.object({
	chatId: z.string(),
	conteudoTexto: z.string().optional(),
	conteudoMidiaTipo: z.enum(["TEXTO", "IMAGEM", "VIDEO", "AUDIO", "DOCUMENTO"]).default("TEXTO"),
	conteudoMidiaBase64: z.string().optional(),
	conteudoMidiaMimeType: z.string().optional(),
	conteudoMidiaArquivoNome: z.string().optional(),
});

export type TCreateMessageInput = z.infer<typeof createMessageBodySchema>;

async function createMessage({ session, input }: { session: TAuthUserSession; input: TCreateMessageInput }) {
	const organizacaoId = session.membership?.organizacao.id;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Get chat with connection info
	const chat = await db.query.chats.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.chatId), eq(fields.organizacaoId, organizacaoId)),
		with: {
			whatsappConexao: {
				columns: {
					id: true,
					token: true,
				},
			},
			cliente: true,
		},
	});

	if (!chat) {
		throw new createHttpError.NotFound("Chat não encontrado.");
	}

	// Get or create service
	let serviceId: string | null = null;
	const existingService = await db.query.chatServices.findFirst({
		where: (fields, { and, eq, or }) => and(eq(fields.chatId, input.chatId), or(eq(fields.status, "PENDENTE"), eq(fields.status, "EM_ANDAMENTO"))),
	});

	if (existingService) {
		serviceId = existingService.id;
		// Update responsible to current user
		if (existingService.responsavelTipo !== "USUÁRIO" || existingService.responsavelUsuarioId !== session.user.id) {
			await db
				.update(chatServices)
				.set({
					responsavelTipo: "USUÁRIO",
					responsavelUsuarioId: session.user.id,
				})
				.where(eq(chatServices.id, serviceId));
		}
	} else {
		// Create new service
		const [newService] = await db
			.insert(chatServices)
			.values({
				organizacaoId,
				chatId: input.chatId,
				clienteId: chat.clienteId,
				responsavelTipo: "USUÁRIO",
				responsavelUsuarioId: session.user.id,
				descricao: "NÃO ESPECIFICADO",
				status: "PENDENTE",
			})
			.returning({ id: chatServices.id });
		serviceId = newService.id;
	}

	// Handle media upload if present
	let mediaStorageId: string | null = null;
	let mediaUrl: string | null = null;
	let mediaFileSize: number | null = null;

	if (input.conteudoMidiaBase64 && input.conteudoMidiaMimeType) {
		// Decode base64 and upload to Supabase Storage
		const fileBuffer = Buffer.from(input.conteudoMidiaBase64, "base64");
		const uploadResult = await uploadChatMedia({
			file: fileBuffer,
			organizacaoId,
			chatId: input.chatId,
			mimeType: input.conteudoMidiaMimeType,
			filename: input.conteudoMidiaArquivoNome || "arquivo",
		});

		mediaStorageId = uploadResult.storageId;
		mediaUrl = uploadResult.publicUrl;
		mediaFileSize = uploadResult.fileSize;
	}

	// Insert message
	const [insertedMessage] = await db
		.insert(chatMessages)
		.values({
			organizacaoId,
			chatId: input.chatId,
			autorTipo: "USUÁRIO",
			autorUsuarioId: session.user.id,
			conteudoTexto: input.conteudoTexto || "",
			conteudoMidiaTipo: input.conteudoMidiaTipo,
			conteudoMidiaUrl: mediaUrl,
			conteudoMidiaStorageId: mediaStorageId,
			conteudoMidiaMimeType: input.conteudoMidiaMimeType,
			conteudoMidiaArquivoNome: input.conteudoMidiaArquivoNome,
			conteudoMidiaArquivoTamanho: mediaFileSize,
			servicoId: serviceId,
			status: "ENVIADO",
			whatsappMessageStatus: "PENDENTE",
		})
		.returning({ id: chatMessages.id, dataEnvio: chatMessages.dataEnvio });

	// Update chat with last message info
	await db
		.update(chats)
		.set({
			ultimaMensagemId: insertedMessage.id,
			ultimaMensagemData: insertedMessage.dataEnvio,
			ultimaMensagemConteudoTexto: input.conteudoTexto,
			ultimaMensagemConteudoTipo: input.conteudoMidiaTipo,
		})
		.where(eq(chats.id, input.chatId));

	return {
		data: {
			messageId: insertedMessage.id,
			chatId: input.chatId,
			requiresWhatsappSend: true,
			chat: {
				status: chat.status,
				whatsappToken: chat.whatsappConexao?.token,
				whatsappPhoneNumberId: chat.whatsappTelefoneId,
				clienteTelefone: chat.cliente?.telefone,
			},
			media: mediaStorageId
				? {
						storageId: mediaStorageId,
						mimeType: input.conteudoMidiaMimeType,
						filename: input.conteudoMidiaArquivoNome,
					}
				: null,
		},
		message: "Mensagem criada com sucesso.",
	};
}

export type TCreateMessageOutput = Awaited<ReturnType<typeof createMessage>>;

async function createMessageRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const body = await req.json();
	const input = createMessageBodySchema.parse(body);

	const result = await createMessage({ session, input });
	return NextResponse.json(result, { status: 201 });
}

// ============= Export handlers =============

export const GET = appApiHandler({
	GET: getMessagesRoute,
});

export const POST = appApiHandler({
	POST: createMessageRoute,
});
