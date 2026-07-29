import { appApiHandler } from "@/lib/app-api";
import { createInternalGatewayDeliverer } from "@/lib/ai/agent/delivery";
import { ensureOrganizationAgent } from "@/lib/ai/agent/provisioning";
import { respondToChatWithAgent } from "@/lib/ai/agent/respond-to-chat";
import { handleAIAudioProcessing, handleAIDocumentProcessing, handleAIImageProcessing, handleAIVideoProcessing } from "@/lib/ai/ai-media-processing";
import { lockConnectedWhatsappPhone, mergeMessageTemplatePhoneMetadataSql, missingMessageTemplatePhoneMetadataCondition } from "@/lib/db-utils";
import { uploadChatMedia } from "@/lib/files-storage/chat-media";
import { formatPhoneAsBase } from "@/lib/formatting";
import { updateInteractionDeliveryState } from "@/lib/interactions/delivery-state";
import { downloadMedia } from "@/lib/whatsapp/internal-gateway";
import { type AppWhatsappStatus, mapWhatsAppStatusToAppStatus } from "@/lib/whatsapp/parsing";
import type { TInteractionsStatusEnum } from "@/schemas/interactions";
import { claimChatForAi, waitAndConfirmAiResponse } from "@/lib/chats/ai-trigger";
import {
	applyProviderDeliveryStatus,
	mapProviderStatusToDeliveryStatus,
	persistIncomingClientMessage,
	resolveIncomingChat,
} from "@/lib/chats/incoming-message";
import { db } from "@/services/drizzle";
import { chatMessages } from "@/services/drizzle/schema/chats";
import { clients } from "@/services/drizzle/schema/clients";
import { interactions } from "@/services/drizzle/schema/interactions";
import { messageTemplates } from "@/services/drizzle/schema/message-templates";
import { supabaseClient } from "@/services/supabase";
import { waitUntil } from "@vercel/functions";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const API_SECRET = process.env.INTERNAL_WHATSAPP_GATEWAY_API_SECRET;

type WebhookEventType = "message.received" | "connection.update" | "message.sent" | "message.updated";
type WebhookMediaType = "image" | "video" | "audio" | "document" | "sticker" | "unknown";

type WebhookMessageReceivedData = {
	whatsappMessageId: string;
	author: {
		id: string;
		name: string;
		phoneNumber: string;
	};
	content: {
		text: string;
		mediaType: WebhookMediaType;
		mediaUrl?: string;
		mediaId?: string;
		mediaSize?: number;
	};
	date: string;
	echo: boolean;
};

type WebhookConnectionUpdateData = {
	status: "connected" | "disconnected" | "connecting" | "qr";
	qrCode?: string | null;
};

type WebhookMessageSentData = {
	clientMessageId?: string;
	whatsappMessageId: string;
	status?: "pending" | "sent";
	recipient?: {
		id: string;
		phoneNumber: string;
	};
	content?: {
		text?: string;
		mediaType?: WebhookMediaType;
	};
	date?: string;
};

type WebhookMessageUpdatedData = {
	clientMessageId?: string;
	whatsappMessageId?: string;
	status: "pending" | "sent" | "delivered" | "read" | "failed";
	author: {
		id: string;
		name: string;
		phoneNumber: string;
	};
};

type WebhookBody =
	| {
			event: "message.received";
			sessionId: string;
			data: WebhookMessageReceivedData;
	  }
	| {
			event: "connection.update";
			sessionId: string;
			timestamp: string;
			data: WebhookConnectionUpdateData;
	  }
	| {
			event: "message.sent";
			sessionId: string;
			data: WebhookMessageSentData;
	  }
	| {
			event: "message.updated";
			sessionId: string;
			data: WebhookMessageUpdatedData;
	  };

async function postWhatsappGatewayRoute(req: NextRequest) {
	const queryApiSecret = req.nextUrl.searchParams.get("apiSecret") ?? undefined;
	const authorizationHeader = req.headers.get("authorization");
	const bearerApiSecret = authorizationHeader?.startsWith("Bearer ") ? authorizationHeader.slice("Bearer ".length).trim() : undefined;
	const isAuthorized = queryApiSecret === API_SECRET || bearerApiSecret === API_SECRET;
	if (!isAuthorized) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] Unauthorized request");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = (await req.json()) as WebhookBody;

	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Received event:", JSON.stringify(body, null, 2));

	// Process webhook asynchronously
	try {
		waitUntil(
			processWebhookAsync(body).catch((error) => {
				console.error("[INTERNAL_WHATSAPP_WEBHOOK] Error processing webhook:", error);
			}),
		);
	} catch (error) {
		console.error("[INTERNAL_WHATSAPP_WEBHOOK] Error processing webhook:", error);
	}

	return NextResponse.json({ success: true }, { status: 200 });
}

async function processWebhookAsync(body: WebhookBody): Promise<void> {
	switch (body.event) {
		case "message.received":
			await handleIncomingMessage(body);
			break;
		case "connection.update":
			await handleConnectionUpdate(body);
			break;
		case "message.sent":
			await handleMessageSent(body);
			break;
		case "message.updated":
			await handleMessageUpdated(body);
			break;
	}
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = appApiHandler({
	POST: postWhatsappGatewayRoute,
});

async function handleConnectionUpdate(body: Extract<WebhookBody, { event: "connection.update" }>): Promise<void> {
	const { sessionId, data } = body;
	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Handling connection update:", JSON.stringify(data, null, 2));
	if (!data.status) return;

	// Find connection by session ID
	const connection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.gatewaySessaoId, sessionId),
		with: {
			telefones: true,
		},
	});

	if (!connection) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] Connection not found for session:", sessionId);
		return;
	}

	// Update connection status
	const updateData: {
		gatewayStatus: string;
		gatewayUltimaConexao?: Date;
	} = {
		gatewayStatus: data.status,
	};

	if (data.status === "connected") {
		updateData.gatewayUltimaConexao = new Date();
	}

	const { whatsappConnections } = await import("@/services/drizzle/schema/whatsapp-connections");
	await db.update(whatsappConnections).set(updateData).where(eq(whatsappConnections.id, connection.id));

	if (data.status === "connected") {
		// Um UPDATE por telefone cobre todos os templates da organização de uma vez, mesclando apenas a chave
		// daquele telefone sobre o valor atual da linha. As condições restringem a escrita aos templates que
		// ainda não têm a entrada e aos telefones que continuam conectados, de modo que uma desconexão
		// concorrente não seja desfeita por este webhook.
		for (const phone of connection.telefones) {
			await db.transaction(async (tx) => {
				const connected = await lockConnectedWhatsappPhone({
					trx: tx,
					organizationId: connection.organizacaoId,
					phoneId: phone.id,
				});
				if (!connected) return;

				await tx
					.update(messageTemplates)
					.set({
						metadados: mergeMessageTemplatePhoneMetadataSql({
							entries: { [phone.id]: { idExterno: "", status: "APROVADO", qualidade: "ALTA" } },
							mode: "keep",
						}),
						dataAtualizacao: new Date(),
					})
					.where(and(eq(messageTemplates.organizacaoId, connection.organizacaoId), missingMessageTemplatePhoneMetadataCondition(phone.id)));
			});
		}
	}
	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Connection status updated:", {
		sessionId,
		status: data.status,
	});
}

async function handleIncomingMessage(body: Extract<WebhookBody, { event: "message.received" }>): Promise<void> {
	const { sessionId, data } = body;
	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Handling incoming message:", JSON.stringify(data, null, 2));
	if (!data.author?.phoneNumber || !data.whatsappMessageId) {
		console.error("[INTERNAL_WHATSAPP_WEBHOOK] Missing required fields in message");
		return;
	}

	// Find connection by session ID (including organization config)
	const connection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.gatewaySessaoId, sessionId),
		with: {
			telefones: true,
			organizacao: {
				columns: { configuracao: true },
			},
		},
	});

	if (!connection) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] Connection not found for session:", sessionId);
		return;
	}

	// Check if hubAtendimentos access is enabled
	const hasHubAccess = connection.organizacao?.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;
	if (!hasHubAccess) {
		console.log("[INTERNAL_WHATSAPP_WEBHOOK] hubAtendimentos disabled, skipping message insertion for session:", sessionId);
		return;
	}

	const organizacaoId = connection.organizacaoId;
	const connectionPhone = connection.telefones[0]; // Internal Gateway has one phone per connection

	if (!connectionPhone) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] No phone found for connection");
		return;
	}

	const allowsAIService = connectionPhone.permitirAtendimentoIa;

	// Find or create client
	const phoneBase = formatPhoneAsBase(data.author.phoneNumber);
	let clientId: string | null = null;

	const existingClient = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.telefoneBase, phoneBase), eq(fields.organizacaoId, organizacaoId)),
	});

	if (existingClient) {
		clientId = existingClient.id;
	} else {
		const [newClient] = await db
			.insert(clients)
			.values({
				organizacaoId,
				nome: data.author.name || data.author.phoneNumber,
				telefone: data.author.phoneNumber,
				telefoneBase: phoneBase,
				canalAquisicao: "WHATSAPP",
			})
			.returning({ id: clients.id });
		clientId = newClient.id;
		console.log("[INTERNAL_WHATSAPP_WEBHOOK] New client created:", clientId);
	}

	if (!clientId) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] Cannot process message without client ID");
		return;
	}

	// No Gateway Interno o sessionId faz o papel do telefone na chave natural do chat.
	const { chatId, isNew } = await resolveIncomingChat({
		organizacaoId,
		clienteId: clientId,
		whatsappTelefoneId: sessionId,
		whatsappConexaoId: connection.id,
		whatsappConexaoTelefoneId: connectionPhone.id,
	});
	if (isNew) console.log("[INTERNAL_WHATSAPP_WEBHOOK] New chat created:", chatId);

	// Download and store media if present
	let mediaData: {
		storageId: string;
		publicUrl: string;
		mimeType: string;
		fileSize: number;
	} | null = null;

	if (data.content.mediaUrl) {
		try {
			const downloaded = await downloadMedia(data.content.mediaUrl);
			const uploaded = await uploadChatMedia({
				file: downloaded.buffer,
				organizacaoId,
				chatId,
				mimeType: downloaded.mimeType,
				filename: undefined,
			});
			mediaData = {
				storageId: uploaded.storageId,
				publicUrl: uploaded.publicUrl,
				mimeType: uploaded.mimeType,
				fileSize: uploaded.fileSize,
			};
			console.log("[INTERNAL_WHATSAPP_WEBHOOK] Media stored:", mediaData.storageId);
		} catch (error) {
			console.error("[INTERNAL_WHATSAPP_WEBHOOK] Error downloading media:", error);
		}
	}

	// Determine media type
	let midiaTipo: "TEXTO" | "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO" = "TEXTO";
	if (data.content.mediaType === "image" || data.content.mediaType === "sticker") midiaTipo = "IMAGEM";
	else if (data.content.mediaType === "document") midiaTipo = "DOCUMENTO";
	else if (data.content.mediaType === "video") midiaTipo = "VIDEO";
	else if (data.content.mediaType === "audio") midiaTipo = "AUDIO";

	const insertedMessage = await persistIncomingClientMessage({
		organizacaoId,
		chatId,
		clienteId: clientId,
		// O Gateway Interno não tem janela de 24h: a sessão do WhatsApp Web é o limite.
		tipoConexao: "INTERNAL_GATEWAY",
		whatsappMessageId: data.whatsappMessageId,
		conteudoTexto: data.content.text || null,
		conteudoMidiaTipo: midiaTipo,
		midia: mediaData ? { ...mediaData, fileSize: mediaData.fileSize ?? data.content.mediaSize, whatsappMediaId: data.content.mediaId } : null,
		metadados: { gatewayInterno: { sessaoId: sessionId } },
	});

	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Message created from:", data.author.phoneNumber);

	if (mediaData && midiaTipo !== "TEXTO") {
		await handleAIMediaProcessing(insertedMessage.messageId, mediaData.storageId, mediaData.mimeType, midiaTipo);
	}

	if (!allowsAIService) return;

	// Capability de plano. Antes só `hubAtendimentos.acesso` era checado, e o atendimento por
	// IA rodava para qualquer organização com um número habilitado.
	const hasAiServiceAccess = connection.organizacao?.configuracao?.recursos?.iaAtendimento?.acesso ?? false;
	if (!hasAiServiceAccess) {
		console.log("[INTERNAL_WHATSAPP_WEBHOOK] Recurso de atendimento com IA indisponível para a organização:", organizacaoId);
		return;
	}

	// Provisionamento lazy: a primeira mensagem cria o agente da organização.
	const agente = await ensureOrganizationAgent(db, organizacaoId);
	if (agente.status !== "ATIVO") {
		console.log("[INTERNAL_WHATSAPP_WEBHOOK] Agente de IA pausado para a organização:", organizacaoId);
		return;
	}

	const claim = await claimChatForAi({ organizacaoId, chatId, agenteId: agente.id });
	if (!claim.shouldRespond) {
		console.log("[INTERNAL_WHATSAPP_WEBHOOK] IA não assumiu o atendimento:", claim.reason);
		return;
	}

	const confirmation = await waitAndConfirmAiResponse({
		organizacaoId,
		chatId,
		messageId: insertedMessage.messageId,
		messageDate: insertedMessage.dataEnvio,
		delayMs: agente.capacidades?.atendimento?.atrasoRespostaMs,
	});
	if (!confirmation.shouldRespond) {
		console.log("[INTERNAL_WHATSAPP_WEBHOOK] Resposta da IA abortada:", confirmation.reason);
		return;
	}

	try {
		const resultado = await respondToChatWithAgent({
			organizacaoId,
			chatId,
			gatilho: "CHAT_MENSAGEM",
			mensagemGatilhoId: insertedMessage.messageId,
			deliver: createInternalGatewayDeliverer({ organizacaoId, chatId, sessaoId: sessionId }),
		});
		console.log("[INTERNAL_WHATSAPP_WEBHOOK] Execução do agente concluída:", resultado.runId);
	} catch (error) {
		// A execução falha fica registrada em `ai_agent_runs` com o erro; nada é enviado ao cliente.
		console.error("[INTERNAL_WHATSAPP_WEBHOOK] Falha na execução do agente de IA:", error);
	}
}

const INTERACTION_STATUS_MAPPING: Record<AppWhatsappStatus, TInteractionsStatusEnum> = {
	PENDENTE: "PENDENTE",
	ENVIADO: "ENVIADO",
	ENTREGUE: "ENTREGUE",
	LIDO: "LIDO",
	FALHOU: "FALHOU",
};

function getRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function resolveMessageTargets({ clientMessageId, whatsappMessageId }: { clientMessageId?: string; whatsappMessageId?: string }): Promise<{
	chatMessageId: string | null;
	interactionId: string | null;
	interactionOrganizationId: string | null;
	interactionMetadados: Record<string, unknown>;
}> {
	if (clientMessageId) {
		const chatMessage = await db.query.chatMessages.findFirst({
			where: (fields, { eq }) => eq(fields.id, clientMessageId),
			columns: { id: true },
		});
		if (chatMessage) {
			return {
				chatMessageId: chatMessage.id,
				interactionId: null,
				interactionOrganizationId: null,
				interactionMetadados: {},
			};
		}

		const interaction = await db.query.interactions.findFirst({
			where: (fields, { eq }) => eq(fields.id, clientMessageId),
			columns: { id: true, organizacaoId: true, metadados: true },
		});

		if (interaction) {
			const interactionMetadados = getRecord(interaction.metadados);
			const chatMessageIdFromMetadata = typeof interactionMetadados.chatMessageId === "string" ? interactionMetadados.chatMessageId : null;

			return {
				chatMessageId: chatMessageIdFromMetadata,
				interactionId: interaction.id,
				interactionOrganizationId: interaction.organizacaoId,
				interactionMetadados,
			};
		}
	}

	if (whatsappMessageId) {
		const [chatMessage, interaction] = await Promise.all([
			db.query.chatMessages.findFirst({
				where: (fields, { eq }) => eq(fields.whatsappMessageId, whatsappMessageId),
				columns: { id: true },
			}),
			db.query.interactions.findFirst({
				where: sql`${interactions.metadados}->>'whatsappMessageId' = ${whatsappMessageId}`,
				columns: { id: true, organizacaoId: true, metadados: true },
			}),
		]);

		return {
			chatMessageId: chatMessage?.id ?? null,
			interactionId: interaction?.id ?? null,
			interactionOrganizationId: interaction?.organizacaoId ?? null,
			interactionMetadados: getRecord(interaction?.metadados),
		};
	}

	return {
		chatMessageId: null,
		interactionId: null,
		interactionOrganizationId: null,
		interactionMetadados: {},
	};
}

async function handleMessageSent(body: Extract<WebhookBody, { event: "message.sent" }>): Promise<void> {
	const { data } = body;
	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Handling message sent:", JSON.stringify(data, null, 2));
	if (!data.whatsappMessageId) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] Missing whatsappMessageId in message sent");
		return;
	}

	const { whatsappStatus } = mapWhatsAppStatusToAppStatus(data.status ?? "sent");
	const targets = await resolveMessageTargets({
		clientMessageId: data.clientMessageId,
		whatsappMessageId: data.whatsappMessageId,
	});

	if (!targets.chatMessageId && !targets.interactionId) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] No targets found for message sent event");
		return;
	}

	if (targets.chatMessageId) {
		const statusEntrega = mapProviderStatusToDeliveryStatus(data.status ?? "sent");
		if (data.whatsappMessageId) {
			await db.update(chatMessages).set({ whatsappMessageId: data.whatsappMessageId }).where(eq(chatMessages.id, targets.chatMessageId));
		}
		if (statusEntrega) await applyProviderDeliveryStatus({ statusEntrega, chatMessageId: targets.chatMessageId });
	}

	if (targets.interactionId) {
		await updateInteractionDeliveryState({
			interactionId: targets.interactionId,
			organizationId: targets.interactionOrganizationId ?? undefined,
			statusEnvio: INTERACTION_STATUS_MAPPING[whatsappStatus],
			metadataPatch: {
				clientMessageId: data.clientMessageId ?? targets.interactionMetadados.clientMessageId,
				whatsappMessageId: data.whatsappMessageId,
			},
		});
	}

	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Message sent reconciled:", {
		clientMessageId: data.clientMessageId,
		whatsappMessageId: data.whatsappMessageId,
	});
}

async function handleMessageUpdated(body: Extract<WebhookBody, { event: "message.updated" }>): Promise<void> {
	const { data } = body;
	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Handling message updated:", JSON.stringify(data, null, 2));
	if (!data.whatsappMessageId && !data.clientMessageId) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] Missing identifiers in message update");
		return;
	}

	const { whatsappStatus } = mapWhatsAppStatusToAppStatus(data.status);
	const targets = await resolveMessageTargets({
		clientMessageId: data.clientMessageId,
		whatsappMessageId: data.whatsappMessageId,
	});

	if (!targets.chatMessageId && !targets.interactionId) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] No targets found for message updated event");
		return;
	}

	if (targets.chatMessageId) {
		const statusEntrega = mapProviderStatusToDeliveryStatus(data.status);
		if (data.whatsappMessageId) {
			await db.update(chatMessages).set({ whatsappMessageId: data.whatsappMessageId }).where(eq(chatMessages.id, targets.chatMessageId));
		}
		if (statusEntrega) await applyProviderDeliveryStatus({ statusEntrega, chatMessageId: targets.chatMessageId });
	}

	if (targets.interactionId) {
		await updateInteractionDeliveryState({
			interactionId: targets.interactionId,
			organizationId: targets.interactionOrganizationId ?? undefined,
			statusEnvio: INTERACTION_STATUS_MAPPING[whatsappStatus],
			metadataPatch: {
				clientMessageId: data.clientMessageId ?? targets.interactionMetadados.clientMessageId,
				whatsappMessageId: data.whatsappMessageId ?? targets.interactionMetadados.whatsappMessageId,
			},
		});
	}

	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Message updated:", {
		clientMessageId: data.clientMessageId,
		whatsappMessageId: data.whatsappMessageId,
		status: data.status,
	});
}

async function handleAIMediaProcessing(
	messageId: string,
	storageId: string,
	mimeType: string,
	mediaType: "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO",
) {
	try {
		// Download file from Supabase Storage
		const { data: fileData, error: downloadError } = await supabaseClient.storage.from("files").download(storageId);

		if (downloadError || !fileData) {
			console.error("[INTERNAL_WHATSAPP_WEBHOOK] Download error:", downloadError);
			throw new Error("Erro ao baixar arquivo do storage");
		}
		const fileBuffer = Buffer.from(await fileData.arrayBuffer());
		let processedText = "";
		let summary = "";

		switch (mediaType) {
			case "AUDIO": {
				const result = await handleAIAudioProcessing(fileBuffer, mimeType);
				processedText = result.transcription;
				summary = result.summary;
				break;
			}
			case "IMAGEM": {
				const result = await handleAIImageProcessing(fileBuffer, mimeType);
				processedText = result.description;
				summary = result.summary;
				break;
			}
			case "VIDEO": {
				const result = await handleAIVideoProcessing(fileBuffer, mimeType);
				processedText = result.analysis;
				summary = result.summary;
				break;
			}
			case "DOCUMENTO": {
				const result = await handleAIDocumentProcessing(fileBuffer, mimeType);
				processedText = result.extraction;
				summary = result.summary;
				break;
			}
		}

		await db
			.update(chatMessages)
			.set({
				conteudoMidiaTextoProcessado: processedText,
				conteudoMidiaTextoProcessadoResumo: summary,
			})
			.where(eq(chatMessages.id, messageId));

		console.log("[INTERNAL_WHATSAPP_WEBHOOK] Media processing completed for:", messageId);

		return {
			success: true,
			processedText,
			summary,
		};
	} catch (error) {
		console.error("[INTERNAL_WHATSAPP_WEBHOOK] Media processing error:", error);
		throw error;
	}
}
