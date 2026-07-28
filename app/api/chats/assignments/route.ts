import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { assertChatAccess, mayManageAssignment } from "@/lib/chats/access";
import {
	assignChatAttendance,
	assumeChatAttendanceForUser,
	changeChatAttendancePriority,
	changeChatAttendanceStatus,
	getCurrentChatAttendance,
	releaseChatAttendance,
	transferChatAttendance,
} from "@/lib/chats/attendance-state";
import { ChatAssignmentPriorityEnum, ChatAssignmentStatusEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { chats } from "@/services/drizzle/schema/chats";
import { organizationMembers } from "@/services/drizzle/schema/organizations";
import { users } from "@/services/drizzle/schema/users";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= PATCH - Ações sobre o atendimento =============

const chatIdField = z.string({ required_error: "ID do chat não informado.", invalid_type_error: "Tipo inválido para o ID do chat." });
const motivoField = z.string({ invalid_type_error: "Tipo inválido para o motivo." }).trim().max(1000).optional().nullable();

const UpdateChatAssignmentInputSchema = z.discriminatedUnion("acao", [
	z.object({ acao: z.literal("assumir"), chatId: chatIdField }),
	z.object({
		acao: z.literal("transferir"),
		chatId: chatIdField,
		usuarioDestinoId: z.string({ required_error: "Usuário de destino não informado." }),
		motivo: motivoField,
		prioridade: ChatAssignmentPriorityEnum.optional().nullable(),
	}),
	z.object({ acao: z.literal("liberar"), chatId: chatIdField, motivo: motivoField }),
	z.object({ acao: z.literal("alterar_status"), chatId: chatIdField, status: ChatAssignmentStatusEnum }),
	z.object({ acao: z.literal("alterar_prioridade"), chatId: chatIdField, prioridade: ChatAssignmentPriorityEnum.nullable() }),
	z.object({ acao: z.literal("atribuir"), chatId: chatIdField, usuarioDestinoId: z.string({ required_error: "Usuário de destino não informado." }) }),
]);
export type TUpdateChatAssignmentInput = z.infer<typeof UpdateChatAssignmentInputSchema>;

/** Cada ação tem sua permissão de entrada; a posse é verificada depois, por atendimento. */
const ACTION_PERMISSION = {
	assumir: "responder",
	transferir: "receberTransferencias",
	liberar: "receberTransferencias",
	alterar_status: "responder",
	alterar_prioridade: "responder",
	atribuir: "finalizar",
} as const;

async function assertChatBelongsToOrganization({ organizacaoId, chatId }: { organizacaoId: string; chatId: string }) {
	const chat = await db.query.chats.findFirst({
		where: and(eq(chats.id, chatId), eq(chats.organizacaoId, organizacaoId)),
		columns: { id: true },
	});
	if (!chat) throw new createHttpError.NotFound("Chat não encontrado.");
}

async function assertTargetUserIsActiveMember({ organizacaoId, usuarioId }: { organizacaoId: string; usuarioId: string }) {
	const [member] = await db
		.select({ id: users.id })
		.from(organizationMembers)
		.innerJoin(users, eq(users.id, organizationMembers.usuarioId))
		.where(and(eq(organizationMembers.organizacaoId, organizacaoId), eq(users.id, usuarioId)))
		.limit(1);
	if (!member) throw new createHttpError.BadRequest("Usuário de destino não encontrado nesta organização.");
}

async function updateChatAssignment({ session, input }: { session: TAuthUserSession; input: TUpdateChatAssignmentInput }) {
	const { organizacaoId } = assertChatAccess({ session, permission: ACTION_PERMISSION[input.acao] });
	await assertChatBelongsToOrganization({ organizacaoId, chatId: input.chatId });

	if (input.acao === "assumir") {
		const assumed = await assumeChatAttendanceForUser(db, { organizacaoId, chatId: input.chatId, usuarioId: session.user.id });
		// null = o compare-and-set não casou: outro usuário assumiu entre a leitura e a
		// escrita. Sobrescrever aqui seria roubar a conversa de quem chegou primeiro.
		if (!assumed) throw new createHttpError.Conflict("Esta conversa já possui responsável.");
		return { data: { chatId: input.chatId, atendimentoId: assumed.id }, message: "Atendimento assumido." };
	}

	const atual = await getCurrentChatAttendance(db, { organizacaoId, chatId: input.chatId });

	if (input.acao === "atribuir") {
		await assertTargetUserIsActiveMember({ organizacaoId, usuarioId: input.usuarioDestinoId });
		const assigned = await assignChatAttendance(db, {
			organizacaoId,
			chatId: input.chatId,
			usuarioId: input.usuarioDestinoId,
			atribuidoPorUsuarioId: session.user.id,
		});
		return { data: { chatId: input.chatId, atendimentoId: assigned?.id ?? null }, message: "Atendimento atribuído." };
	}

	if (input.acao === "transferir") {
		if (!atual) throw new createHttpError.Conflict("Conversa sem atendimento ativo.");
		if (!mayManageAssignment({ session, assignment: atual })) {
			throw new createHttpError.Forbidden("Somente o responsável ou um gestor pode transferir este atendimento.");
		}
		await assertTargetUserIsActiveMember({ organizacaoId, usuarioId: input.usuarioDestinoId });
		const transferred = await transferChatAttendance(db, {
			organizacaoId,
			chatId: input.chatId,
			usuarioDestinoId: input.usuarioDestinoId,
			motivo: input.motivo ?? null,
			prioridade: input.prioridade ?? null,
			transferidoPorUsuarioId: session.user.id,
		});
		return { data: { chatId: input.chatId, atendimentoId: transferred?.id ?? null }, message: "Atendimento transferido." };
	}

	if (input.acao === "liberar") {
		if (!atual) throw new createHttpError.Conflict("Conversa sem atendimento ativo.");
		if (!mayManageAssignment({ session, assignment: atual })) {
			throw new createHttpError.Forbidden("Somente o responsável ou um gestor pode liberar este atendimento.");
		}
		const released = await releaseChatAttendance(db, { organizacaoId, chatId: input.chatId, motivo: input.motivo ?? null });
		return { data: { chatId: input.chatId, atendimentoId: released?.id ?? null }, message: "Atendimento liberado." };
	}

	if (input.acao === "alterar_status") {
		if (atual && !mayManageAssignment({ session, assignment: atual })) {
			throw new createHttpError.Forbidden("Somente o responsável ou um gestor pode alterar este atendimento.");
		}
		const updated = await changeChatAttendanceStatus(db, {
			organizacaoId,
			chatId: input.chatId,
			status: input.status,
			usuarioId: session.user.id,
		});
		return { data: { chatId: input.chatId, atendimentoId: updated?.id ?? null }, message: "Status do atendimento atualizado." };
	}

	if (atual && !mayManageAssignment({ session, assignment: atual })) {
		throw new createHttpError.Forbidden("Somente o responsável ou um gestor pode alterar este atendimento.");
	}
	const updated = await changeChatAttendancePriority(db, { organizacaoId, chatId: input.chatId, prioridade: input.prioridade });
	return { data: { chatId: input.chatId, atendimentoId: updated?.id ?? null }, message: "Prioridade do atendimento atualizada." };
}
export type TUpdateChatAssignmentOutput = Awaited<ReturnType<typeof updateChatAssignment>>;

async function updateChatAssignmentRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	const input = UpdateChatAssignmentInputSchema.parse(await req.json());
	const result = await updateChatAssignment({ session: session as TAuthUserSession, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= GET - Usuários elegíveis para transferência =============

async function getTransferTargets({ session }: { session: TAuthUserSession }) {
	const { organizacaoId } = assertChatAccess({ session, permission: "visualizar" });

	const rows = await db
		.select({ id: users.id, nome: users.nome, avatarUrl: users.avatarUrl, permissoes: organizationMembers.permissoes })
		.from(organizationMembers)
		.innerJoin(users, eq(users.id, organizationMembers.usuarioId))
		.where(eq(organizationMembers.organizacaoId, organizacaoId));

	// Só faz sentido transferir para quem pode receber transferências e responder.
	const usuarios = rows
		.filter((row) => row.id !== session.user.id)
		.filter((row) => row.permissoes?.atendimentos?.receberTransferencias ?? false)
		.map((row) => ({ id: row.id, nome: row.nome, avatarUrl: row.avatarUrl }));

	return { data: { usuarios }, message: "Usuários carregados com sucesso." };
}
export type TGetTransferTargetsOutput = Awaited<ReturnType<typeof getTransferTargets>>;

async function getTransferTargetsRoute(_req: NextRequest) {
	const session = await getCurrentSessionUncached();
	const result = await getTransferTargets({ session: session as TAuthUserSession });
	return NextResponse.json(result, { status: 200 });
}

// ============= Export handlers =============

export const GET = appApiHandler({ GET: getTransferTargetsRoute });
export const PATCH = appApiHandler({ PATCH: updateChatAssignmentRoute });
