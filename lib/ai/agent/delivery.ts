import { applyProviderDeliveryStatus, persistOutboundNonHubMessage } from "@/lib/chats/incoming-message";
import { isWhatsappWindowOpen } from "@/lib/chats/whatsapp-window-status";
import { sendMessage as sendInternalGatewayMessage } from "@/lib/whatsapp/internal-gateway";
import { formatPhoneAsWhatsappId, formatPhoneForInternalGateway } from "@/lib/whatsapp/utils";
import { db } from "@/services/drizzle";
import { chats } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import type { TAgentMessageDeliverer } from "./respond-to-chat";

/**
 * Adapters de entrega da mensagem do agente, um por canal.
 *
 * Ficam fora do runtime de propósito: as regras de canal (janela de 24h da Meta, fila do
 * gateway interno) não devem ser decisões do modelo nem viver no loop do agente.
 *
 * Todos persistem a mensagem com `metadados.aiAgente`, o espelho denormalizado do vínculo
 * canônico `ai_agent_runs.mensagemEnviadaId` — o hub exibe a origem sem precisar de join.
 */

// `runId` e `agenteId` chegam por argumento na entrega — só existem depois que a execução abre.
type TDelivererParams = { organizacaoId: string; chatId: string };

async function loadChatForDelivery(organizacaoId: string, chatId: string) {
	return db.query.chats.findFirst({
		where: and(eq(chats.id, chatId), eq(chats.organizacaoId, organizacaoId)),
		columns: { id: true, clienteId: true, whatsappTelefoneId: true, whatsappJanelaDataExpiracao: true },
		with: {
			cliente: { columns: { telefone: true } },
			whatsappConexao: { columns: { token: true, tipoConexao: true, gatewaySessaoId: true, gatewayStatus: true } },
		},
	});
}

/** Meta Cloud API: envia primeiro, persiste depois — o id do provider volta na resposta. */
export function createMetaCloudDeliverer({ organizacaoId, chatId }: TDelivererParams): TAgentMessageDeliverer {
	return async ({ mensagem, runId, agenteId }) => {
		const chat = await loadChatForDelivery(organizacaoId, chatId);
		if (!chat) {
			console.error("[AI_AGENT] [DELIVERY] Chat não encontrado para entrega:", chatId);
			return { messageId: null };
		}

		// Fora da janela de 24h só passa template, e a IA não envia template.
		if (!isWhatsappWindowOpen({ expiracao: chat.whatsappJanelaDataExpiracao, tipoConexao: chat.whatsappConexao?.tipoConexao })) {
			console.log("[AI_AGENT] [DELIVERY] Janela de 24h expirada, resposta descartada:", chatId);
			return { messageId: null };
		}

		const whatsappMessageId = await (async () => {
			if (!chat.whatsappConexao?.token || !chat.cliente?.telefone || !chat.whatsappTelefoneId) return null;
			try {
				const { sendBasicWhatsappMessage } = await import("@/lib/whatsapp");
				const response = await sendBasicWhatsappMessage({
					fromPhoneNumberId: chat.whatsappTelefoneId,
					toPhoneNumber: formatPhoneAsWhatsappId(chat.cliente.telefone),
					content: mensagem,
					whatsappToken: chat.whatsappConexao.token,
				});
				return response.whatsappMessageId;
			} catch (error) {
				console.error("[AI_AGENT] [DELIVERY] Falha no envio via Meta Cloud API:", error);
				return null;
			}
		})();

		const inserted = await persistOutboundNonHubMessage({
			organizacaoId,
			chatId,
			clienteId: chat.clienteId,
			origem: "AI",
			whatsappMessageId,
			conteudoTexto: mensagem,
			conteudoMidiaTipo: "TEXTO",
			midia: null,
			metadados: { aiAgente: { runId, agenteId } },
		});

		if (!whatsappMessageId) {
			await applyProviderDeliveryStatus({ statusEntrega: "FALHA", chatMessageId: inserted.messageId });
		}

		return { messageId: inserted.messageId };
	};
}

/**
 * Gateway interno: persiste primeiro (a mensagem nasce PENDENTE) e enfileira depois — o
 * `clientMessageId` é o próprio id da mensagem, que é como o webhook `message.sent` reconcilia.
 */
export function createInternalGatewayDeliverer({ organizacaoId, chatId, sessaoId }: TDelivererParams & { sessaoId: string }): TAgentMessageDeliverer {
	return async ({ mensagem, runId, agenteId }) => {
		const chat = await loadChatForDelivery(organizacaoId, chatId);
		if (!chat) {
			console.error("[AI_AGENT] [DELIVERY] Chat não encontrado para entrega:", chatId);
			return { messageId: null };
		}

		const inserted = await persistOutboundNonHubMessage({
			organizacaoId,
			chatId,
			clienteId: chat.clienteId,
			origem: "AI",
			whatsappMessageId: null,
			conteudoTexto: mensagem,
			conteudoMidiaTipo: "TEXTO",
			midia: null,
			metadados: { gatewayInterno: { sessaoId }, aiAgente: { runId, agenteId } },
		});

		if (!chat.whatsappConexao?.gatewaySessaoId || chat.whatsappConexao.gatewayStatus !== "connected" || !chat.cliente?.telefone) {
			console.warn("[AI_AGENT] [DELIVERY] Gateway interno indisponível:", chatId);
			await applyProviderDeliveryStatus({ statusEntrega: "FALHA", chatMessageId: inserted.messageId });
			return { messageId: inserted.messageId };
		}

		try {
			const response = await sendInternalGatewayMessage(
				chat.whatsappConexao.gatewaySessaoId,
				formatPhoneForInternalGateway(chat.cliente.telefone),
				{ type: "text", text: mensagem },
				{ clientMessageId: inserted.messageId },
			);
			if (!response.success) throw new Error(response.error || "Falha ao enfileirar a mensagem da IA no Gateway Interno.");
		} catch (error) {
			console.error("[AI_AGENT] [DELIVERY] Falha ao enfileirar no gateway interno:", error);
			await applyProviderDeliveryStatus({ statusEntrega: "FALHA", chatMessageId: inserted.messageId });
		}

		return { messageId: inserted.messageId };
	};
}

/**
 * Playground: apenas persiste. Sem envio externo e sem checagem de janela — o chat de teste
 * não tem conexão de WhatsApp.
 */
export function createPlaygroundDeliverer({ organizacaoId, chatId }: TDelivererParams): TAgentMessageDeliverer {
	return async ({ mensagem, runId, agenteId }) => {
		const chat = await loadChatForDelivery(organizacaoId, chatId);
		if (!chat) return { messageId: null };

		const inserted = await persistOutboundNonHubMessage({
			organizacaoId,
			chatId,
			clienteId: chat.clienteId,
			origem: "AI",
			whatsappMessageId: null,
			conteudoTexto: mensagem,
			conteudoMidiaTipo: "TEXTO",
			midia: null,
			metadados: { aiAgente: { runId, agenteId } },
		});

		return { messageId: inserted.messageId };
	};
}
