import { claimChatAttendanceForAgent, getCurrentChatAttendance } from "@/lib/chats/attendance-state";
import { db } from "@/services/drizzle";
import { chatMessages } from "@/services/drizzle/schema";
import { and, desc, eq, gt, inArray } from "drizzle-orm";

/**
 * Decide se a IA deve responder a uma mensagem recebida.
 *
 * Duas mudanças sobre o modelo antigo:
 *
 * 1. **A IA reivindica o atendimento em vez de ser dona por padrão.** Antes, o serviço
 *    nascia com `responsavelTipo: "AI"` sempre que o número permitia, e o humano tinha
 *    que tomar a conversa dela. Agora o ticket nasce sem dono e a IA só entra se o
 *    compare-and-set de `claimChatAttendanceForAgent` casar — se um humano assumiu
 *    primeiro, a IA nem chega a gerar resposta.
 *
 * 2. **O debounce sai da coluna `ai_agendamento_resposta_data`.** O modelo antigo gravava
 *    um timestamp no chat e comparava na volta do sleep; isso perdia corridas (dois
 *    webhooks quase simultâneos escreviam timestamps diferentes e os dois seguiam) e
 *    acoplava um detalhe de execução ao schema. Agora a checagem é sobre os fatos: a
 *    mensagem que disparou ainda é a última do cliente, e ninguém respondeu depois dela.
 */

const AI_RESPONSE_DELAY_MS = 5000;

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export type TAiTriggerDecision = { shouldRespond: true } | { shouldRespond: false; reason: string };

/**
 * Reivindica o atendimento para a IA.
 *
 * Devolve `false` quando a conversa já tem dono — humano do hub, telefone ou outro
 * episódio da própria IA que ainda não encerrou.
 */
export async function claimChatForAi({
	organizacaoId,
	chatId,
	agenteId,
}: {
	organizacaoId: string;
	chatId: string;
	agenteId: string;
}): Promise<TAiTriggerDecision> {
	const atual = await getCurrentChatAttendance(db, { organizacaoId, chatId });

	if (atual?.responsavelTipo === "USUARIO") return { shouldRespond: false, reason: "Atendimento com responsável humano." };
	if (atual?.responsavelTipo === "EXTERNO") return { shouldRespond: false, reason: "Atendimento em andamento pelo telefone." };
	// Já é da IA: o episódio segue, não precisa reivindicar de novo.
	if (atual?.responsavelTipo === "AGENTE") return { shouldRespond: true };

	const claimed = await claimChatAttendanceForAgent(db, { organizacaoId, chatId, agenteId });
	if (!claimed) return { shouldRespond: false, reason: "Atendimento assumido por outra parte durante o claim." };

	return { shouldRespond: true };
}

/**
 * Reconfirma que responder ainda faz sentido, sobre os fatos da conversa.
 *
 * Aborta se o cliente mandou outra mensagem depois da que disparou (a mais nova dispara o
 * próprio ciclo, e responder à antiga produziria duas respostas), se alguém já respondeu, ou
 * se o atendimento deixou de ser da IA.
 *
 * Separado do debounce de propósito: o gatilho por webhook precisa esperar antes de conferir,
 * mas o gatilho do hub (um humano entregando a conversa ao agente) não tem rajada de mensagens
 * para agrupar — precisa das mesmas verificações, sem a espera.
 */
export async function confirmAiResponseStillValid({
	organizacaoId,
	chatId,
	messageId,
	messageDate,
}: {
	organizacaoId: string;
	chatId: string;
	messageId: string;
	messageDate: Date;
}): Promise<TAiTriggerDecision> {
	const ultimaDoCliente = await db.query.chatMessages.findFirst({
		where: and(eq(chatMessages.chatId, chatId), eq(chatMessages.autorTipo, "CLIENTE")),
		orderBy: [desc(chatMessages.dataEnvio), desc(chatMessages.id)],
		columns: { id: true },
	});
	if (ultimaDoCliente?.id !== messageId) return { shouldRespond: false, reason: "Chegou mensagem mais recente do cliente." };

	const respostaPosterior = await db.query.chatMessages.findFirst({
		where: and(
			eq(chatMessages.chatId, chatId),
			inArray(chatMessages.autorTipo, ["USUÁRIO", "AI", "BUSINESS-APP"]),
			gt(chatMessages.dataEnvio, messageDate),
		),
		columns: { id: true },
	});
	if (respostaPosterior) return { shouldRespond: false, reason: "A conversa já foi respondida." };

	// Reconfirma a posse antes de gastar tokens: o humano pode ter assumido no intervalo.
	const atual = await getCurrentChatAttendance(db, { organizacaoId, chatId });
	if (atual?.responsavelTipo !== "AGENTE") return { shouldRespond: false, reason: "O atendimento deixou de ser da IA." };

	return { shouldRespond: true };
}

/**
 * Aguarda o debounce e reconfirma que a resposta ainda faz sentido. Caminho do webhook: agrupa
 * a rajada de mensagens do cliente e só então confere os fatos.
 */
export async function waitAndConfirmAiResponse({
	organizacaoId,
	chatId,
	messageId,
	messageDate,
	delayMs = AI_RESPONSE_DELAY_MS,
}: {
	organizacaoId: string;
	chatId: string;
	messageId: string;
	messageDate: Date;
	delayMs?: number;
}): Promise<TAiTriggerDecision> {
	await sleep(delayMs);
	return confirmAiResponseStillValid({ organizacaoId, chatId, messageId, messageDate });
}

export { AI_RESPONSE_DELAY_MS };
