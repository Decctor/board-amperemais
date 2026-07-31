import { resolveChatDeliverer } from "@/lib/ai/agent/delivery";
import { ensureOrganizationAgent } from "@/lib/ai/agent/provisioning";
import { respondToChatWithAgent } from "@/lib/ai/agent/respond-to-chat";
import { claimChatForAi, confirmAiResponseStillValid } from "@/lib/chats/ai-trigger";
import { db } from "@/services/drizzle";

/**
 * Turno de IA disparado por uma mensagem do cliente, independente do transporte que o
 * invocou — inline no webhook (sob waitUntil) ou consumer de Vercel Queues.
 *
 * Idempotente e seguro sob reentrega: claim por CAS, confirmação pré-run e revalidação
 * pré-entrega são checados aqui dentro, contra o banco. Um retry de um turno velho vê os
 * fatos atualizados e recua sozinho.
 *
 * Pressupõe o debounce já cumprido (sleep no transporte inline, delaySeconds na fila).
 */
export type TAiTurnPayload = {
	organizacaoId: string;
	chatId: string;
	mensagemGatilhoId: string;
	// ISO string: o payload atravessa JSON (fila) sem perder tipo.
	mensagemGatilhoDataEnvio: string;
};

export async function runAiTurnForMessage(payload: TAiTurnPayload): Promise<void> {
	const agent = await ensureOrganizationAgent(db, payload.organizacaoId);
	if (agent.status !== "ATIVO") {
		console.log("[AI_TURN] Agente de IA pausado para a organização:", payload.organizacaoId);
		return;
	}

	// Claim depois do debounce: mais perto da entrega, menor a janela para responder por
	// cima de um humano que assumiu durante a espera.
	const claim = await claimChatForAi({ organizacaoId: payload.organizacaoId, chatId: payload.chatId, agenteId: agent.id });
	if (!claim.shouldRespond) {
		console.log("[AI_TURN] IA não assumiu o atendimento:", claim.reason);
		return;
	}

	const confirmation = await confirmAiResponseStillValid({
		organizacaoId: payload.organizacaoId,
		chatId: payload.chatId,
		messageId: payload.mensagemGatilhoId,
		messageDate: new Date(payload.mensagemGatilhoDataEnvio),
	});
	if (!confirmation.shouldRespond) {
		console.log("[AI_TURN] Resposta da IA abortada:", confirmation.reason);
		return;
	}

	// Sem canal de entrega não há turno: gastar tokens numa resposta que não sai é pior
	// do que não responder.
	const deliver = await resolveChatDeliverer({ organizacaoId: payload.organizacaoId, chatId: payload.chatId });
	if (!deliver) {
		console.warn("[AI_TURN] Sem canal de entrega para o chat:", payload.chatId);
		return;
	}

	try {
		const result = await respondToChatWithAgent({
			organizacaoId: payload.organizacaoId,
			chatId: payload.chatId,
			gatilho: "CHAT_MENSAGEM",
			mensagemGatilhoId: payload.mensagemGatilhoId,
			deliver,
		});
		console.log("[AI_TURN] Execução do agente concluída:", result.runId);
	} catch (error) {
		// A execução falha fica registrada em `ai_agent_runs` com o erro; nada é enviado ao
		// cliente — mensagem genérica de desculpas só esconderia o problema.
		console.error("[AI_TURN] Falha na execução do agente de IA:", error);
	}
}
