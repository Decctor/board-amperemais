import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import type { TWhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";
import { getWhatsappTemplatePayload } from "@/lib/whatsapp/templates";
import type { TWhatsappTemplate } from "@/schemas/whatsapp-templates";
import { db } from "@/services/drizzle";
import { type TClientEntity, chatMessages, chats, interactions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { parseTemplatePayloadToGatewayContent, sendMessage } from "../whatsapp/internal-gateway";
import { formatPhoneForInternalGateway } from "../whatsapp/utils";

export type ImmediateProcessingData = {
	interactionId: string;
	organizationId: string;
	client: {
		id: string;
		nome: string;
		telefone: string;
		email: string | null;
		analiseRFMTitulo: string | null;
		metadataProdutoMaisCompradoId: TClientEntity["metadataProdutoMaisCompradoId"];
		metadataGrupoProdutoMaisComprado: TClientEntity["metadataGrupoProdutoMaisComprado"];
	};
	campaign: {
		autorId: string;
		whatsappConexaoTelefoneId: string;
		whatsappTemplate: TWhatsappTemplate;
	};
	whatsappToken?: string;
	whatsappSessionId?: string;
};

export type ProcessSingleInteractionResult = {
	success: boolean;
	error?: string;
};

/**
 * Processes a single interaction immediately after it's created.
 * This function handles:
 * 1. Building WhatsApp template payload
 * 2. Finding or creating chat record
 * 3. Inserting chat message
 * 4. Sending WhatsApp message
 * 5. Updating interaction with dataExecucao
 * 6. Error handling (marks message as "FALHOU", doesn't mark interaction as executed)
 */
export async function processSingleInteractionImmediately(params: ImmediateProcessingData): Promise<ProcessSingleInteractionResult> {
	const { interactionId, organizationId, client, campaign, whatsappToken, whatsappSessionId } = params;

	try {
		console.log(`[IMMEDIATE_PROCESS] Processing interaction ${interactionId} for org ${organizationId}`);

		const clientFavoriteProduct = client.metadataProdutoMaisCompradoId
			? (
					await db.query.products.findFirst({
						where: (fields, { eq }) => eq(fields.id, client.metadataProdutoMaisCompradoId as string),
					})
				)?.descricao
			: null;
		// Build WhatsApp template payload
		const whatsappTemplateVariablesValuesMap: Record<keyof TWhatsappTemplateVariables, string> = {
			clientEmail: client.email ?? "",
			clientName: client.nome,
			clientPhoneNumber: client.telefone,
			clientSegmentation: client.analiseRFMTitulo ?? "",
			clientFavoriteProduct: clientFavoriteProduct ?? "",
			clientFavoriteProductGroup: client.metadataGrupoProdutoMaisComprado ?? "",
			clientSuggestedProduct: "",
		};

		const payload = getWhatsappTemplatePayload({
			template: {
				name: campaign.whatsappTemplate.nome,
				content: campaign.whatsappTemplate.componentes.corpo.conteudo,
				components: campaign.whatsappTemplate.componentes,
			},
			variables: whatsappTemplateVariablesValuesMap,
			toPhoneNumber: client.telefone,
		});

		console.log(`[IMMEDIATE_PROCESS] Creating template message for interaction ${interactionId}`);

		// Find or create chat
		let chatId: string | null = null;
		const existingChat = await db.query.chats.findFirst({
			where: (fields, { and, eq }) =>
				and(
					eq(fields.organizacaoId, organizationId),
					eq(fields.clienteId, client.id),
					eq(fields.whatsappConexaoTelefoneId, campaign.whatsappConexaoTelefoneId),
				),
		});

		if (existingChat) {
			chatId = existingChat.id;
		} else {
			const [newChat] = await db
				.insert(chats)
				.values({
					organizacaoId: organizationId,
					clienteId: client.id,
					whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId,
					ultimaMensagemData: new Date(),
					ultimaMensagemConteudoTipo: "TEXTO",
				})
				.returning({ id: chats.id });
			chatId = newChat.id;
		}

		// Insert chat message
		const insertedChatMessageResponse = await db
			.insert(chatMessages)
			.values({
				organizacaoId: organizationId,
				chatId: chatId,
				autorTipo: "USUÁRIO",
				autorUsuarioId: campaign.autorId,
				conteudoTexto: payload.content,
				conteudoMidiaTipo: "TEXTO",
			})
			.returning({ id: chatMessages.id });

		const insertedChatMessageId = insertedChatMessageResponse[0]?.id;

		if (!insertedChatMessageId) {
			throw new Error("Failed to insert chat message");
		}

		try {
			// Send WhatsApp message
			let sentWhatsappTemplateResponse = null;
			if (whatsappToken) {
				sentWhatsappTemplateResponse = await sendTemplateWhatsappMessage({
					fromPhoneNumberId: campaign.whatsappConexaoTelefoneId,
					templatePayload: payload.data,
					whatsappToken: whatsappToken,
				});
				console.log("[IMMEDIATE_PROCESS] Sent WHATSAPP TEMPLATE RESPONSE", sentWhatsappTemplateResponse);
				// Update chat message with WhatsApp message ID
				await db
					.update(chatMessages)
					.set({
						whatsappMessageId: sentWhatsappTemplateResponse.whatsappMessageId,
						whatsappMessageStatus: "ENVIADO",
					})
					.where(eq(chatMessages.id, insertedChatMessageId));

				// Mark interaction as executed
				await db
					.update(interactions)
					.set({
						dataExecucao: new Date(),
					})
					.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)));

				console.log(`[IMMEDIATE_PROCESS] Successfully processed interaction ${interactionId}`);
			} else if (whatsappSessionId) {
				const gatewayPayload = {
					...payload.data,
					to: formatPhoneForInternalGateway(client.telefone),
				};
				const templateContent = parseTemplatePayloadToGatewayContent(gatewayPayload);
				sentWhatsappTemplateResponse = await sendMessage(whatsappSessionId, formatPhoneForInternalGateway(client.telefone), templateContent);
				console.log("[IMMEDIATE_PROCESS] Sent WHATSAPP TEMPLATE RESPONSE", sentWhatsappTemplateResponse);
				// Update chat message with WhatsApp message ID
				await db
					.update(chatMessages)
					.set({
						whatsappMessageId: sentWhatsappTemplateResponse.messageId,
						whatsappMessageStatus: "ENVIADO",
					})
					.where(eq(chatMessages.id, insertedChatMessageId));

				// Mark interaction as executed
				await db
					.update(interactions)
					.set({
						dataExecucao: new Date(),
					})
					.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)));

				console.log(`[IMMEDIATE_PROCESS] Successfully processed interaction ${interactionId}`);
			} else {
				throw new Error("WhatsApp token or session ID is required");
			}

			return { success: true };
		} catch (sendError) {
			console.error(`[IMMEDIATE_PROCESS] Failed to send WhatsApp message for interaction ${interactionId}:`, sendError);

			// Mark message as failed
			await db
				.update(chatMessages)
				.set({
					whatsappMessageStatus: "FALHOU",
				})
				.where(eq(chatMessages.id, insertedChatMessageId));

			// Don't mark interaction as executed, so it can be retried by cron job
			return {
				success: false,
				error: sendError instanceof Error ? sendError.message : "Failed to send WhatsApp message",
			};
		}
	} catch (error) {
		console.error(`[IMMEDIATE_PROCESS] Error processing interaction ${interactionId}:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Helper to add a small delay between processing multiple interactions
 * to avoid rate limiting issues
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
