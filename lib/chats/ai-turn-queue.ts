import type { TAiTurnPayload } from "@/lib/chats/ai-turn-runner";
import { send } from "@vercel/queue";

/** Consumido por `app/api/queues/ai-chat-turn` (trigger `queue/v2beta` no vercel.json). */
export const AI_TURN_TOPIC = "ai-chat-turns";

export async function sendAiTurnToQueue(payload: TAiTurnPayload, { delayMs }: { delayMs: number }): Promise<void> {
	await send(AI_TURN_TOPIC, payload, {
		// O debounce vira delay gerenciado: a mensagem só fica visível ao consumer após a
		// espera, e o webhook devolve o 200 sem segurar compute.
		delaySeconds: Math.max(1, Math.round(delayMs / 1000)),
		// Uma publicação por mensagem do cliente, mesmo que o webhook seja reentregue entre o
		// persist e o publish. Segunda linha de defesa atrás do índice de wamid (0057).
		idempotencyKey: `ai-turn-${payload.triggerMessageId}`,
	});
}
