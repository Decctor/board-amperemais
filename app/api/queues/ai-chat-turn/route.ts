import { runAiTurnForMessage } from "@/lib/chats/ai-turn-runner";
import { handleCallback } from "@vercel/queue";
import { z } from "zod";

/**
 * Consumer do tópico `ai-chat-turns` (produtor em `lib/chats/ai-turn-queue.ts`).
 *
 * A rota não tem URL pública: triggers `queue/v2beta` (ver vercel.json) só são invocáveis
 * pela infraestrutura interna da Vercel, por isso não há checagem de autenticação aqui.
 *
 * A entrega da fila é at-least-once e sem FIFO — as duas coisas são inócuas por
 * construção: o runner reconfere claim, última mensagem e resposta posterior contra o
 * banco antes de qualquer envio, então um turno reentregue ou fora de ordem recua sozinho.
 */
const AiTurnQueueMessageSchema = z.object({
	organizationId: z.string({ invalid_type_error: "Tipo inválido para o id da organização." }),
	chatId: z.string({ invalid_type_error: "Tipo inválido para o id do chat." }),
	triggerMessageId: z.string({ invalid_type_error: "Tipo inválido para o id da mensagem gatilho." }),
	triggerMessageSentAt: z.string({ invalid_type_error: "Tipo inválido para a data da mensagem gatilho." }),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = handleCallback(
	async (message) => {
		await runAiTurnForMessage(AiTurnQueueMessageSchema.parse(message));
	},
	{
		retry: (error, metadata) => {
			// Um retry de turno velho é inofensivo (o runner reconfere os fatos), mas uma
			// mensagem envenenada não pode retentar até o TTL: três tentativas e reconhece.
			if (metadata.deliveryCount >= 3) {
				console.error("[AI_TURN] [QUEUE] Mensagem descartada após 3 tentativas:", metadata.messageId, error);
				return { acknowledge: true };
			}
			return { afterSeconds: 30 };
		},
	},
);
