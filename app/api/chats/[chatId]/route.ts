import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { chatMessages, chatServices, chats } from "@/services/drizzle/schema/chats";
import { clients } from "@/services/drizzle/schema/clients";
import { users } from "@/services/drizzle/schema/users";
import { and, eq, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = {
	params: Promise<{ chatId: string }>;
};

// ============= GET - Get chat details with client and service =============

async function getChatDetails({ session, chatId }: { session: TAuthUserSession["user"]; chatId: string }) {
	const organizacaoId = session.organizacaoId;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Get chat with client
	const chat = await db.query.chats.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, chatId), eq(fields.organizacaoId, organizacaoId)),
		with: {
			cliente: true,
			whatsappConexao: true,
			whatsappConexaoTelefone: true,
		},
	});

	if (!chat) {
		throw new createHttpError.NotFound("Chat não encontrado.");
	}

	// Get open service for this chat
	const openService = await db.query.chatServices.findFirst({
		where: (fields, { and, eq, or }) => and(eq(fields.chatId, chatId), or(eq(fields.status, "PENDENTE"), eq(fields.status, "EM_ANDAMENTO"))),
		with: {
			responsavelUsuario: {
				columns: {
					id: true,
					nome: true,
					avatarUrl: true,
				},
			},
		},
	});

	return {
		data: {
			...chat,
			atendimentoAberto: openService
				? {
						id: openService.id,
						descricao: openService.descricao,
						status: openService.status,
						dataInicio: openService.dataInicio,
						responsavelTipo: openService.responsavelTipo,
						responsavelUsuario: openService.responsavelUsuarioId
							? {
									id: openService.responsavelUsuarioId,
									nome: openService.responsavelUsuario?.nome,
									avatarUrl: openService.responsavelUsuario?.avatarUrl,
								}
							: null,
					}
				: null,
		},
		message: "Chat carregado com sucesso.",
	};
}

export type TGetChatDetailsOutput = Awaited<ReturnType<typeof getChatDetails>>;

async function getChatRoute(req: NextRequest, context: RouteContext) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const { chatId } = await context.params;
	const result = await getChatDetails({ session: session.user, chatId });
	return NextResponse.json(result, { status: 200 });
}

// ============= PATCH - Update chat (mark as read, update status) =============

const updateChatBodySchema = z.object({
	action: z.enum(["mark_as_read", "update_status"]),
	status: z.enum(["ABERTA", "FECHADA"]).optional(),
});

export type TUpdateChatInput = z.infer<typeof updateChatBodySchema>;

async function updateChat({ session, chatId, input }: { session: TAuthUserSession["user"]; chatId: string; input: TUpdateChatInput }) {
	const organizacaoId = session.organizacaoId;

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

	if (input.action === "mark_as_read") {
		// Mark all unread client messages as read
		await db
			.update(chatMessages)
			.set({ status: "LIDO" })
			.where(
				and(
					eq(chatMessages.chatId, chatId),
					eq(chatMessages.autorTipo, "CLIENTE"),
					or(eq(chatMessages.status, "ENVIADO"), eq(chatMessages.status, "RECEBIDO")),
				),
			);

		// Reset unread count
		await db.update(chats).set({ mensagensNaoLidas: 0 }).where(eq(chats.id, chatId));

		return {
			data: { chatId, action: "mark_as_read" },
			message: "Mensagens marcadas como lidas.",
		};
	}

	if (input.action === "update_status" && input.status) {
		await db.update(chats).set({ status: input.status }).where(eq(chats.id, chatId));

		return {
			data: { chatId, action: "update_status", status: input.status },
			message: "Status do chat atualizado.",
		};
	}

	throw new createHttpError.BadRequest("Ação inválida.");
}

export type TUpdateChatOutput = Awaited<ReturnType<typeof updateChat>>;

async function updateChatRoute(req: NextRequest, context: RouteContext) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const { chatId } = await context.params;
	const body = await req.json();
	const input = updateChatBodySchema.parse(body);

	const result = await updateChat({ session: session.user, chatId, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= Export handlers =============

export const GET = appApiHandler({
	GET: (req: NextRequest) => getChatRoute(req, { params: Promise.resolve({ chatId: req.nextUrl.pathname.split("/").pop()! }) }),
});

export const PATCH = appApiHandler({
	PATCH: (req: NextRequest) => updateChatRoute(req, { params: Promise.resolve({ chatId: req.nextUrl.pathname.split("/").pop()! }) }),
});
