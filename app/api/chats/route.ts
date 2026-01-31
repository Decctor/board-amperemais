import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { chatServices, chats } from "@/services/drizzle/schema/chats";
import { clients } from "@/services/drizzle/schema/clients";
import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= GET - List chats with pagination and search =============

const getChatsQuerySchema = z.object({
	whatsappPhoneId: z.string(),
	cursor: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(20),
	search: z.string().optional(),
});

export type TGetChatsInput = z.infer<typeof getChatsQuerySchema>;

async function getChats({ session, input }: { session: TAuthUserSession; input: TGetChatsInput }) {
	const { whatsappPhoneId, cursor, limit, search } = input;
	const organizacaoId = session.membership?.organizacao.id;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Parse cursor (format: "timestamp_id")
	let cursorTimestamp: Date | null = null;
	let cursorId: string | null = null;
	if (cursor) {
		const [timestampStr, id] = cursor.split("_");
		cursorTimestamp = new Date(Number.parseInt(timestampStr, 10));
		cursorId = id;
	}

	// Build base query conditions
	const baseConditions = and(
		eq(chats.organizacaoId, organizacaoId),
		eq(chats.whatsappConexaoTelefoneId, whatsappPhoneId),
		cursorTimestamp
			? or(lt(chats.ultimaMensagemData, cursorTimestamp), and(eq(chats.ultimaMensagemData, cursorTimestamp), lt(chats.id, cursorId!)))
			: undefined,
	);

	let chatResults: (typeof chats.$inferSelect & { cliente: typeof clients.$inferSelect | null })[];

	if (search && search.trim().length > 0) {
		// Search by client name or last message content
		const searchPattern = `%${search}%`;

		chatResults = await db
			.select({
				id: chats.id,
				organizacaoId: chats.organizacaoId,
				clienteId: chats.clienteId,
				whatsappConexaoId: chats.whatsappConexaoId,
				whatsappConexaoTelefoneId: chats.whatsappConexaoTelefoneId,
				whatsappTelefoneId: chats.whatsappTelefoneId,
				mensagensNaoLidas: chats.mensagensNaoLidas,
				ultimaMensagemId: chats.ultimaMensagemId,
				ultimaMensagemData: chats.ultimaMensagemData,
				ultimaMensagemConteudoTipo: chats.ultimaMensagemConteudoTipo,
				ultimaMensagemConteudoTexto: chats.ultimaMensagemConteudoTexto,
				status: chats.status,
				ultimaInteracaoClienteData: chats.ultimaInteracaoClienteData,
				aiAgendamentoRespostaData: chats.aiAgendamentoRespostaData,
				dataInsercao: chats.dataInsercao,
				cliente: clients,
			})
			.from(chats)
			.leftJoin(clients, eq(chats.clienteId, clients.id))
			.where(and(baseConditions, or(ilike(clients.nome, searchPattern), ilike(chats.ultimaMensagemConteudoTexto, searchPattern))))
			.orderBy(desc(chats.ultimaMensagemData), desc(chats.id))
			.limit(limit + 1);
	} else {
		// No search - efficient indexed query
		chatResults = await db
			.select({
				id: chats.id,
				organizacaoId: chats.organizacaoId,
				clienteId: chats.clienteId,
				whatsappConexaoId: chats.whatsappConexaoId,
				whatsappConexaoTelefoneId: chats.whatsappConexaoTelefoneId,
				whatsappTelefoneId: chats.whatsappTelefoneId,
				mensagensNaoLidas: chats.mensagensNaoLidas,
				ultimaMensagemId: chats.ultimaMensagemId,
				ultimaMensagemData: chats.ultimaMensagemData,
				ultimaMensagemConteudoTipo: chats.ultimaMensagemConteudoTipo,
				ultimaMensagemConteudoTexto: chats.ultimaMensagemConteudoTexto,
				status: chats.status,
				ultimaInteracaoClienteData: chats.ultimaInteracaoClienteData,
				aiAgendamentoRespostaData: chats.aiAgendamentoRespostaData,
				dataInsercao: chats.dataInsercao,
				cliente: clients,
			})
			.from(chats)
			.leftJoin(clients, eq(chats.clienteId, clients.id))
			.where(baseConditions)
			.orderBy(desc(chats.ultimaMensagemData), desc(chats.id))
			.limit(limit + 1);
	}

	// Check if there are more results
	const hasMore = chatResults.length > limit;
	const items = hasMore ? chatResults.slice(0, limit) : chatResults;

	// Create next cursor
	let nextCursor: string | null = null;
	if (hasMore && items.length > 0) {
		const lastItem = items[items.length - 1];
		nextCursor = `${lastItem.ultimaMensagemData.getTime()}_${lastItem.id}`;
	}

	return {
		data: {
			items,
			hasMore,
			nextCursor,
		},
		message: "Chats carregados com sucesso.",
	};
}

export type TGetChatsOutput = Awaited<ReturnType<typeof getChats>>;

async function getChatsRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const searchParams = req.nextUrl.searchParams;
	const input = getChatsQuerySchema.parse({
		whatsappPhoneId: searchParams.get("whatsappPhoneId"),
		cursor: searchParams.get("cursor") || undefined,
		limit: searchParams.get("limit") || 20,
		search: searchParams.get("search") || undefined,
	});

	const result = await getChats({ session, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= POST - Create or get chat by client =============

const createChatBodySchema = z.object({
	clienteId: z.string(),
	whatsappPhoneNumberId: z.string(),
	whatsappConexaoId: z.string().optional(),
	whatsappConexaoTelefoneId: z.string().optional(),
});

export type TCreateChatInput = z.infer<typeof createChatBodySchema>;

async function createChat({ session, input }: { session: TAuthUserSession; input: TCreateChatInput }) {
	const { clienteId, whatsappPhoneNumberId, whatsappConexaoId, whatsappConexaoTelefoneId } = input;
	const organizacaoId = session.membership?.organizacao.id;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Check if client exists
	const client = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, clienteId), eq(fields.organizacaoId, organizacaoId)),
	});

	if (!client) {
		throw new createHttpError.NotFound("Cliente não encontrado.");
	}

	// Check if chat already exists for this client and phone
	const existingChat = await db.query.chats.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.organizacaoId, organizacaoId), eq(fields.clienteId, clienteId), eq(fields.whatsappTelefoneId, whatsappPhoneNumberId)),
	});

	if (existingChat) {
		return {
			data: {
				chatId: existingChat.id,
				clientId: clienteId,
				isNew: false,
			},
			message: "Chat já existente.",
		};
	}

	// Create new chat
	const [newChat] = await db
		.insert(chats)
		.values({
			organizacaoId,
			clienteId,
			whatsappTelefoneId: whatsappPhoneNumberId,
			whatsappConexaoId,
			whatsappConexaoTelefoneId,
			mensagensNaoLidas: 0,
			ultimaMensagemData: new Date(),
			ultimaMensagemConteudoTipo: "TEXTO",
			status: "ABERTA",
		})
		.returning({ id: chats.id });

	// Create initial service for the chat
	await db.insert(chatServices).values({
		organizacaoId,
		chatId: newChat.id,
		clienteId,
		responsavelTipo: "AI",
		descricao: "NÃO ESPECIFICADO",
		status: "PENDENTE",
	});

	return {
		data: {
			chatId: newChat.id,
			clientId: clienteId,
			isNew: true,
		},
		message: "Chat criado com sucesso.",
	};
}

export type TCreateChatOutput = Awaited<ReturnType<typeof createChat>>;

async function createChatRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const body = await req.json();
	const input = createChatBodySchema.parse(body);

	const result = await createChat({ session, input });
	return NextResponse.json(result, { status: 201 });
}

// ============= Export handlers =============

export const GET = appApiHandler({
	GET: getChatsRoute,
});

export const POST = appApiHandler({
	POST: createChatRoute,
});
