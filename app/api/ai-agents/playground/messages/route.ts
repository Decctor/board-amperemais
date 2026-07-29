import { createPlaygroundDeliverer } from "@/lib/ai/agent/delivery";
import { getPlaygroundState, persistPlaygroundClientMessage } from "@/lib/ai/agent/playground";
import { respondToChatWithAgent } from "@/lib/ai/agent/respond-to-chat";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { chats } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// A execução roda dentro do POST (sem debounce, resposta síncrona): um turno com várias
// chamadas de ferramenta passa folgadamente dos 30s padrão.
export const maxDuration = 300;

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const SendPlaygroundMessageInputSchema = z.object({
	chatId: z.string({ required_error: "ID do chat de teste não informado.", invalid_type_error: "Tipo inválido para o ID do chat de teste." }),
	texto: z
		.string({ required_error: "Mensagem não informada.", invalid_type_error: "Tipo inválido para a mensagem." })
		.min(1, "A mensagem não pode ser vazia.")
		.max(4000, "A mensagem deve ter no máximo 4000 caracteres."),
});
export type TSendPlaygroundMessageInput = z.infer<typeof SendPlaygroundMessageInputSchema>;

// ============================================================================
// SERVICES
// ============================================================================

async function sendPlaygroundMessage({ input, organizacaoId }: { input: TSendPlaygroundMessageInput; organizacaoId: string }) {
	const chat = await db.query.chats.findFirst({
		where: and(eq(chats.id, input.chatId), eq(chats.organizacaoId, organizacaoId), eq(chats.origem, "PLAYGROUND")),
		columns: { id: true, clienteId: true },
	});
	if (!chat) throw new createHttpError.NotFound("Chat de teste não encontrado.");

	const mensagemCliente = await persistPlaygroundClientMessage({
		organizacaoId,
		chatId: chat.id,
		clienteId: chat.clienteId,
		texto: input.texto,
	});

	// Pipeline idêntico ao de produção — só o gatilho e o adapter de entrega mudam.
	const resultado = await respondToChatWithAgent({
		organizacaoId,
		chatId: chat.id,
		gatilho: "PLAYGROUND",
		mensagemGatilhoId: mensagemCliente.messageId,
		deliver: createPlaygroundDeliverer({ organizacaoId, chatId: chat.id }),
	});

	const estado = await getPlaygroundState({ organizacaoId, chatId: chat.id });

	return {
		data: { runId: resultado.runId, estado },
		message: "Mensagem processada com sucesso.",
	};
}
export type TSendPlaygroundMessageOutput = Awaited<ReturnType<typeof sendPlaygroundMessage>>;

// ============================================================================
// HANDLERS
// ============================================================================

async function sendPlaygroundMessageRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Sessão não encontrada.");
	if (!session.membership.organizacao.configuracao?.recursos?.iaAtendimento?.acesso) {
		throw new createHttpError.Forbidden("O recurso de atendimento com IA não está disponível no plano da sua organização.");
	}
	if (!session.membership.permissoes.empresa.editar) {
		throw new createHttpError.Forbidden("Você não tem permissão para testar o agente de IA.");
	}

	const input = SendPlaygroundMessageInputSchema.parse(await request.json());
	const result = await sendPlaygroundMessage({ input, organizacaoId: session.membership.organizacao.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: sendPlaygroundMessageRoute });
