import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { assertChatAccess } from "@/lib/chats/access";
import { markChatAnswered } from "@/lib/chats/attendance-state";
import { buildRetryMedia, deliverChatMessage, loadChatForSending } from "@/lib/chats/outgoing-message";
import { db } from "@/services/drizzle";
import { chatMessages, chats } from "@/services/drizzle/schema/chats";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= POST - Reenviar mensagem com falha =============

const RetryChatMessageInputSchema = z.object({
	messageId: z.string({ required_error: "ID da mensagem não informado.", invalid_type_error: "Tipo inválido para o ID da mensagem." }),
});
export type TRetryChatMessageInput = z.infer<typeof RetryChatMessageInputSchema>;

async function retryChatMessage({ session, input }: { session: TAuthUserSession; input: TRetryChatMessageInput }) {
	const { organizacaoId } = assertChatAccess({ session, permission: "responder" });

	const message = await db.query.chatMessages.findFirst({
		where: and(eq(chatMessages.id, input.messageId), eq(chatMessages.organizacaoId, organizacaoId)),
	});
	if (!message) throw new createHttpError.NotFound("Mensagem não encontrada.");
	if (message.statusEntrega !== "FALHA") throw new createHttpError.BadRequest("Apenas mensagens com falha podem ser reenviadas.");
	// O payload de um template não é reconstruível a partir da mensagem persistida, e um
	// reenvio fora da janela abre uma nova conversa cobrada. O usuário reenvia pelo hub.
	if (message.whatsappTemplateId) throw new createHttpError.BadRequest("Reenvie o template pelo seletor de templates.");

	const { chat, atendimentoAtivo, janelaAberta } = await loadChatForSending({ organizacaoId, chatId: message.chatId });

	if (atendimentoAtivo?.responsavelTipo !== "USUARIO" || atendimentoAtivo.responsavelUsuarioId !== session.user.id) {
		throw new createHttpError.Forbidden("Assuma este atendimento antes de enviar mensagens.");
	}
	if (!janelaAberta) {
		throw new createHttpError.PreconditionFailed("Janela de 24h expirada. Envie um template aprovado para reabrir a conversa.");
	}

	await db.update(chatMessages).set({ statusEntrega: "PENDENTE" }).where(eq(chatMessages.id, message.id));

	const delivery = await deliverChatMessage({
		messageId: message.id,
		chat,
		texto: message.conteudoTexto ?? "",
		midia: buildRetryMedia(message),
		template: null,
	});

	const now = new Date();
	await db.update(chats).set({ ultimaMensagemSaidaData: now }).where(eq(chats.id, message.chatId));
	await markChatAnswered(db, { organizacaoId, chatId: message.chatId, responseDate: now, source: "HUB", now });

	return {
		data: { messageId: message.id, statusEntrega: delivery.statusEntrega, whatsappMessageId: delivery.whatsappMessageId },
		message: "Mensagem reenviada.",
	};
}
export type TRetryChatMessageOutput = Awaited<ReturnType<typeof retryChatMessage>>;

async function retryChatMessageRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	const input = RetryChatMessageInputSchema.parse(await req.json());
	const result = await retryChatMessage({ session: session as TAuthUserSession, input });
	return NextResponse.json(result, { status: 200 });
}

export const POST = appApiHandler({ POST: retryChatMessageRoute });
