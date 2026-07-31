import { appApiHandler } from "@/lib/app-api";
import { ensureOrganizationAgent } from "@/lib/ai/agent/provisioning";
import { handleAIAudioProcessing, handleAIDocumentProcessing, handleAIImageProcessing, handleAIVideoProcessing } from "@/lib/ai/ai-media-processing";
import { lockConnectedWhatsappPhone, mergeMessageTemplatePhoneMetadataSql } from "@/lib/db-utils";
import { downloadAndStoreWhatsappMedia } from "@/lib/files-storage/chat-media";
import { resolveWhatsappClient } from "@/lib/whatsapp/contact-identity";
import { updateInteractionDeliveryState } from "@/lib/interactions/delivery-state";
import {
	buildWhatsappTemplateSyncPatch,
	getMetaWhatsappTemplate,
	META_CATEGORY_TO_MESSAGE_TEMPLATE,
	type TMessageTemplateApprovalStatus,
	type TMessageTemplateCategory,
	type TMessageTemplateQuality,
} from "@/lib/message-templates";
import {
	type AppWhatsappStatus,
	isMessageEchoEvent,
	isMessageEvent,
	isStatusUpdate,
	isTemplateEvent,
	mapWhatsAppStatusToAppStatus,
	parseStatusUpdate,
	parseTemplateCategoryUpdate,
	parseTemplateQualityUpdate,
	parseTemplateStatusUpdate,
	parseWebhookIncomingMessage,
	parseWebhookMessageEcho,
} from "@/lib/whatsapp/parsing";
import {
	parseSmbAppStateSyncWebhook,
	resolveOrganizationIdByWhatsappPhoneNumberId,
	type TSmbAppStateSyncEvent,
	upsertClientsFromSmbAppStateSync,
} from "@/lib/whatsapp/smb-contacts-sync";
import {
	importWhatsappMessageHistoryEvents,
	parseWhatsappMessageHistoryWebhook,
	type TWhatsappMessageHistoryEvent,
} from "@/lib/whatsapp/smb-message-history-sync";
import type { TInteractionsStatusEnum } from "@/schemas/interactions";
import type { TMessageTemplateMetadata } from "@/schemas/message-templates";
import { AI_RESPONSE_DELAY_MS } from "@/lib/chats/ai-trigger";
import { dispatchAiTurn } from "@/lib/chats/ai-turn-dispatch";
import {
	applyProviderDeliveryStatus,
	mapProviderStatusToDeliveryStatus,
	persistIncomingClientMessage,
	persistOutboundNonHubMessage,
	resolveIncomingChat,
} from "@/lib/chats/incoming-message";
import { db } from "@/services/drizzle";
import { chatMessages } from "@/services/drizzle/schema/chats";
import { interactions } from "@/services/drizzle/schema/interactions";
import { messageTemplates } from "@/services/drizzle/schema/message-templates";
import { whatsappConnectionPhones } from "@/services/drizzle/schema/whatsapp-connections";
import { supabaseClient } from "@/services/supabase";
import { waitUntil } from "@vercel/functions";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

type WebhookBody = {
	object: string;
	entry: Array<{
		id: string;
		changes: Array<{
			value: {
				messaging_product: string;
				metadata: {
					display_phone_number: string;
					phone_number_id: string;
				};
				contacts?: Array<{
					profile: { name: string };
					wa_id: string;
				}>;
				history?: Array<unknown>;
				messages?: Array<unknown>;
				statuses?: Array<unknown>;
			};
			field: string;
		}>;
	}>;
};

async function getWhatsappWebhookRoute(req: NextRequest) {
	// Webhook verification (GET request)
	const searchParams = req.nextUrl.searchParams;
	console.log("[INFO] [WHATSAPP_WEBHOOK] [VERIFY] Query received:", Object.fromEntries(searchParams));
	const mode = searchParams.get("hub.mode");
	const token = searchParams.get("hub.verify_token");
	const challenge = searchParams.get("hub.challenge");

	if (mode && token) {
		if (mode === "subscribe" && token === VERIFY_TOKEN) {
			console.log("WEBHOOK_VERIFIED");
			return new NextResponse(challenge, { status: 200 });
		}
		console.log("WEBHOOK_VERIFICATION_FAILED");
		return NextResponse.json({ error: "Verification failed" }, { status: 403 });
	}

	return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
}

async function postWhatsappWebhookRoute(req: NextRequest) {
	const body = (await req.json()) as WebhookBody;

	console.log("[INFO] [WHATSAPP_WEBHOOK] [POST] Incoming webhook message:", JSON.stringify(body, null, 2));

	if (body.object === "whatsapp_business_account") {
		// A Meta reentrega quando o 200 demora — e o processamento inclui debounce e run de
		// LLM. Todo o trabalho sai da request, como o webhook do Gateway Interno já faz; as
		// reentregas residuais são inócuas graças ao índice de wamid (0057).
		waitUntil(processWebhookAsync(body));
		return NextResponse.json({ success: true }, { status: 200 });
	}

	return NextResponse.json({ error: "Event not supported" }, { status: 404 });
}

/**
 * Process webhook events asynchronously after returning 200 to WhatsApp
 */
async function processWebhookAsync(body: WebhookBody): Promise<void> {
	try {
		const contactsSyncEvents = parseSmbAppStateSyncWebhook(body);
		if (contactsSyncEvents.length > 0) {
			await handleSmbAppStateSync(contactsSyncEvents);
			return;
		}
		const messageHistoryEvents = parseWhatsappMessageHistoryWebhook(body);
		if (messageHistoryEvents.length > 0) {
			await handleWhatsappMessageHistory(messageHistoryEvents);
			return;
		}
		// Handle template events
		if (isTemplateEvent(body)) {
			await handleTemplateEvent(body);
			return;
		}

		// Handle status updates
		if (isStatusUpdate(body)) {
			await handleStatusUpdate(body);
			return;
		}
		// Handle incoming messages
		if (isMessageEvent(body)) {
			await handleIncomingMessage(body);
			return;
		}
		// Handle message echoes (WhatsApp Coexistence)
		if (isMessageEchoEvent(body)) {
			await handleMessageEcho(body);
			return;
		}
	} catch (error) {
		console.error("[WHATSAPP_WEBHOOK] Error processing webhook:", error);
	}
}

async function handleWhatsappMessageHistory(events: TWhatsappMessageHistoryEvent[]): Promise<void> {
	const result = await importWhatsappMessageHistoryEvents(events);
	console.log("[WHATSAPP_WEBHOOK] [MESSAGE_HISTORY] Eventos processados:", result);
}

async function handleSmbAppStateSync(events: TSmbAppStateSyncEvent[]): Promise<void> {
	for (const event of events) {
		const organizationId = await resolveOrganizationIdByWhatsappPhoneNumberId(event.whatsappPhoneNumberId);
		if (!organizationId) {
			console.warn("[WHATSAPP_WEBHOOK] [SMB_APP_STATE_SYNC] Organização não encontrada para o telefone:", event.whatsappPhoneNumberId);
			continue;
		}

		const result = await upsertClientsFromSmbAppStateSync({
			organizationId,
			contacts: event.contacts,
		});
		console.log("[WHATSAPP_WEBHOOK] [SMB_APP_STATE_SYNC] Contatos processados:", {
			whatsappPhoneNumberId: event.whatsappPhoneNumberId,
			organizationId,
			...result,
		});
	}
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = appApiHandler({
	GET: getWhatsappWebhookRoute,
});

export const POST = appApiHandler({
	POST: postWhatsappWebhookRoute,
});

/**
 * Handle template status/quality/category updates
 * Keeps the universal message template metadata in sync with Meta webhook events.
 */
async function handleTemplateEvent(body: WebhookBody): Promise<void> {
	const statusUpdate = parseTemplateStatusUpdate(body);
	if (statusUpdate?.status) {
		console.log("[WHATSAPP_WEBHOOK] Template status update:", statusUpdate);
		await updateUniversalTemplatePhoneMetadata(statusUpdate.messageTemplateId, {
			status: statusUpdate.status,
			rejeicao: statusUpdate.reason ?? null,
		});
		await syncUniversalTemplateComponentsFromMeta(statusUpdate.messageTemplateId);
	}

	const qualityUpdate = parseTemplateQualityUpdate(body);
	if (qualityUpdate?.quality) {
		console.log("[WHATSAPP_WEBHOOK] Template quality update:", qualityUpdate);
		await updateUniversalTemplatePhoneMetadata(qualityUpdate.messageTemplateId, {
			qualidade: qualityUpdate.quality,
		});
	}

	const categoryUpdate = parseTemplateCategoryUpdate(body);
	if (categoryUpdate?.category) {
		console.log("[WHATSAPP_WEBHOOK] Template category update received:", categoryUpdate);
		await updateUniversalTemplateCategory(categoryUpdate.messageTemplateId, categoryUpdate.category);
		await syncUniversalTemplateComponentsFromMeta(categoryUpdate.messageTemplateId);
	}
}

function mapMetaWebhookCategory(category: string): TMessageTemplateCategory | null {
	const normalizedCategory = category.toUpperCase() as keyof typeof META_CATEGORY_TO_MESSAGE_TEMPLATE;
	return META_CATEGORY_TO_MESSAGE_TEMPLATE[normalizedCategory] ?? null;
}

async function findUniversalTemplatesByMetaTemplateId(messageTemplateId: string) {
	return db.query.messageTemplates.findMany({
		where: sql`EXISTS (
			SELECT 1
			FROM jsonb_each(${messageTemplates.metadados}->'porNumeroTelefone') AS entry(key, value)
			WHERE value->>'idExterno' = ${messageTemplateId}
		)`,
	});
}

async function updateUniversalTemplatePhoneMetadata(
	messageTemplateId: string,
	update: { status?: TMessageTemplateApprovalStatus; qualidade?: TMessageTemplateQuality; rejeicao?: string | null },
): Promise<void> {
	const templates = await findUniversalTemplatesByMetaTemplateId(messageTemplateId);
	for (const template of templates) {
		// Apenas as entradas do template notificado pela Meta são regravadas; as demais chaves ficam com o
		// valor que estiver no banco no momento do UPDATE, e o modo `existing-only` impede que um telefone
		// desconectado em paralelo retorne através do snapshot lido acima.
		const changedPhoneMetadata = Object.fromEntries(
			Object.entries(template.metadados.porNumeroTelefone)
				.filter(([, metadata]) => metadata.idExterno === messageTemplateId)
				.map(([phoneId, metadata]) => [
					phoneId,
					{
						...metadata,
						...(update.status ? { status: update.status } : {}),
						...(update.qualidade ? { qualidade: update.qualidade } : {}),
					},
				]),
		) satisfies TMessageTemplateMetadata["porNumeroTelefone"];
		if (Object.keys(changedPhoneMetadata).length === 0) continue;

		await db
			.update(messageTemplates)
			.set({
				metadados: mergeMessageTemplatePhoneMetadataSql({ entries: changedPhoneMetadata, mode: "existing-only" }),
				...(update.rejeicao ? { alerta: update.rejeicao } : {}),
				dataAtualizacao: new Date(),
			})
			.where(eq(messageTemplates.id, template.id));
	}
}

async function updateUniversalTemplateCategory(messageTemplateId: string, category: string): Promise<void> {
	const mappedCategory = mapMetaWebhookCategory(category);
	if (!mappedCategory) return;

	const templates = await findUniversalTemplatesByMetaTemplateId(messageTemplateId);
	for (const template of templates) {
		await db
			.update(messageTemplates)
			.set({
				categoria: mappedCategory,
				dataAtualizacao: new Date(),
			})
			.where(eq(messageTemplates.id, template.id));
	}
}

async function syncUniversalTemplateComponentsFromMeta(messageTemplateId: string): Promise<void> {
	const templates = await findUniversalTemplatesByMetaTemplateId(messageTemplateId);
	for (const template of templates) {
		const matchingPhoneIds = Object.entries(template.metadados.porNumeroTelefone)
			.filter(([, metadata]) => metadata.idExterno === messageTemplateId)
			.map(([phoneId]) => phoneId);

		for (const phoneId of matchingPhoneIds) {
			try {
				const phone = await db.query.whatsappConnectionPhones.findFirst({
					where: eq(whatsappConnectionPhones.id, phoneId),
					with: { conexao: { columns: { token: true } } },
				});
				if (!phone?.conexao?.token) continue;

				const metaTemplate = await getMetaWhatsappTemplate({
					accessToken: phone.conexao.token,
					templateId: messageTemplateId,
				});
				const patch = buildWhatsappTemplateSyncPatch({
					template,
					connectionId: phoneId,
					metaTemplate,
				});
				const phoneMetadata = patch.metadados.porNumeroTelefone[phoneId];
				if (!phoneMetadata) continue;

				// A chamada à Meta acima abre uma janela entre a leitura do template e a gravação: a mescla
				// dentro do UPDATE e a condição do telefone impedem que uma desconexão ocorrida nesse intervalo
				// seja desfeita.
				await db.transaction(async (tx) => {
					const connected = await lockConnectedWhatsappPhone({
						trx: tx,
						organizationId: template.organizacaoId,
						phoneId,
					});
					if (!connected) return;

					await tx
						.update(messageTemplates)
						.set({
							nome: patch.nome,
							categoria: patch.categoria,
							linguagem: patch.linguagem,
							conteudo: patch.conteudo,
							metadados: mergeMessageTemplatePhoneMetadataSql({ entries: { [phoneId]: phoneMetadata }, mode: "replace" }),
							alerta: patch.alerta,
							dataAtualizacao: new Date(),
						})
						.where(and(eq(messageTemplates.id, template.id), eq(messageTemplates.organizacaoId, template.organizacaoId)));
				});
			} catch (error) {
				console.error("[WHATSAPP_WEBHOOK] Failed to sync universal template components:", {
					messageTemplateId,
					phoneId,
					error,
				});
			}
		}
	}
}

const INTERACTION_STATUS_MAPPING: Record<AppWhatsappStatus, TInteractionsStatusEnum> = {
	PENDENTE: "PENDENTE",
	ENVIADO: "ENVIADO",
	ENTREGUE: "ENTREGUE",
	LIDO: "LIDO",
	FALHOU: "FALHOU",
};
/**
 * Handle message status updates (sent, delivered, read, failed)
 */
async function handleStatusUpdate(body: WebhookBody): Promise<void> {
	const statusUpdate = parseStatusUpdate(body);
	if (!statusUpdate) return;
	const { whatsappStatus } = mapWhatsAppStatusToAppStatus(statusUpdate.status);

	const previousInteraction = await db.query.interactions.findFirst({
		where: sql`${interactions.metadados}->>'whatsappMessageId' = ${statusUpdate.whatsappMessageId}`,
		columns: {
			id: true,
			organizacaoId: true,
		},
	});
	const statusEntrega = mapProviderStatusToDeliveryStatus(statusUpdate.status);
	if (statusEntrega) {
		// Sem regressão: a Meta entrega eventos fora de ordem, e um "sent" atrasado não
		// pode rebaixar uma mensagem já marcada como lida.
		await applyProviderDeliveryStatus({ statusEntrega, whatsappMessageId: statusUpdate.whatsappMessageId });
	}

	if (previousInteraction) {
		if (!previousInteraction.organizacaoId) {
			console.warn("[WHATSAPP_WEBHOOK] Interação sem organizacaoId; atualizando estado de entrega apenas por id:", {
				interactionId: previousInteraction.id,
				whatsappMessageId: statusUpdate.whatsappMessageId,
			});
		}

		await updateInteractionDeliveryState({
			interactionId: previousInteraction.id,
			organizationId: previousInteraction.organizacaoId ?? undefined,
			statusEnvio: INTERACTION_STATUS_MAPPING[whatsappStatus],
			erroEnvio: whatsappStatus === "FALHOU" ? (statusUpdate.errorMessage ?? "Mensagem não entregue pelo WhatsApp.") : null,
			metadataPatch: {
				whatsappMessageId: statusUpdate.whatsappMessageId,
				...(statusUpdate.errors && statusUpdate.errors.length > 0 ? { whatsappErrors: statusUpdate.errors } : {}),
			},
		});
	}
	console.log("[WHATSAPP_WEBHOOK] Status updated for message:", statusUpdate.whatsappMessageId);
}

/**
 * Handle incoming messages from clients
 */
async function handleIncomingMessage(body: WebhookBody): Promise<void> {
	const incomingMessage = parseWebhookIncomingMessage(body);
	console.log("[WHATSAPP_WEBHOOK] Incoming message:", incomingMessage);
	if (!incomingMessage) {
		console.error("[WHATSAPP_WEBHOOK] Failed to parse incoming message");
		return;
	}

	// Find WhatsApp connection by phone number ID (including organization config)
	const connectionPhone = await db.query.whatsappConnectionPhones.findFirst({
		where: (fields, { eq }) => eq(fields.whatsappTelefoneId, incomingMessage.whatsappPhoneNumberId),
		with: {
			conexao: {
				with: {
					organizacao: {
						columns: { configuracao: true },
					},
				},
			},
		},
	});

	if (!connectionPhone?.conexao) {
		console.warn("[WHATSAPP_WEBHOOK] No WhatsApp connection found for:", incomingMessage.whatsappPhoneNumberId);
		return;
	}

	const organizacaoId = connectionPhone.conexao.organizacaoId;
	const whatsappToken = connectionPhone.conexao.token!; // Meta Cloud API connections always have token
	const whatsappConexaoId = connectionPhone.conexaoId;
	const whatsappConexaoTelefoneId = connectionPhone.id;
	const allowsAIService = connectionPhone.permitirAtendimentoIa;

	// ESTÁGIO 1 — IDENTIDADE, sem gate: a base de contatos e o BSUID crescem com o tráfego
	// de WhatsApp mesmo para organizações sem hub de atendimentos.
	const resolvedClient = await resolveWhatsappClient({
		organizacaoId,
		telefone: incomingMessage.fromPhoneNumber,
		whatsappUserId: incomingMessage.whatsappUserId,
		profileName: incomingMessage.profileName,
	});
	if (!resolvedClient) {
		console.warn("[WHATSAPP_WEBHOOK] Mensagem sem identidade resolvível (sem telefone e sem BSUID):", incomingMessage.whatsappMessageId);
		return;
	}
	if (resolvedClient.isNew) console.log("[WHATSAPP_WEBHOOK] New client created:", resolvedClient.clientId);
	const clientId = resolvedClient.clientId;

	// ESTÁGIO 2 — CONVERSA: daqui em diante é acompanhamento de mensagens, o que o hub gate
	// de fato governa.
	const hasHubAccess = connectionPhone.conexao.organizacao?.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;
	if (!hasHubAccess) {
		console.log("[WHATSAPP_WEBHOOK] hubAtendimentos disabled, skipping message insertion for:", incomingMessage.whatsappPhoneNumberId);
		return;
	}

	// Upsert pela chave natural: webhooks concorrentes criavam chats duplicados antes da 0052.
	const { chatId, isNew } = await resolveIncomingChat({
		organizacaoId,
		clienteId: clientId,
		whatsappTelefoneId: incomingMessage.whatsappPhoneNumberId,
		whatsappConexaoId,
		whatsappConexaoTelefoneId,
	});
	if (isNew) console.log("[WHATSAPP_WEBHOOK] New chat created:", chatId);

	// Download and store media if present
	let mediaData: {
		storageId: string;
		publicUrl: string;
		mimeType: string;
		fileSize: number;
	} | null = null;

	if (incomingMessage.mediaId && incomingMessage.mimeType) {
		try {
			mediaData = await downloadAndStoreWhatsappMedia({
				mediaId: incomingMessage.mediaId,
				mimeType: incomingMessage.mimeType,
				filename: incomingMessage.filename,
				organizacaoId,
				chatId,
				whatsappToken,
			});
			console.log("[WHATSAPP_WEBHOOK] Media stored:", mediaData.storageId);
		} catch (error) {
			console.error("[WHATSAPP_WEBHOOK] Error downloading media:", error);
		}
	}

	// Determine media type
	let midiaTipo: "TEXTO" | "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO" = "TEXTO";
	if (incomingMessage.messageType === "image") midiaTipo = "IMAGEM";
	else if (incomingMessage.messageType === "document") midiaTipo = "DOCUMENTO";
	else if (incomingMessage.messageType === "video") midiaTipo = "VIDEO";
	else if (incomingMessage.messageType === "audio") midiaTipo = "AUDIO";

	// Persiste, atualiza a denormalização do chat, renova a janela de 24h e reabre a
	// pendência do atendimento — tudo em lib/chats/incoming-message.ts, compartilhado
	// com o webhook do Gateway Interno.
	const insertedMessage = await persistIncomingClientMessage({
		organizacaoId,
		chatId,
		clienteId: clientId,
		tipoConexao: "META_CLOUD_API",
		whatsappMessageId: incomingMessage.whatsappMessageId,
		conteudoTexto: incomingMessage.textContent || incomingMessage.caption || null,
		conteudoMidiaTipo: midiaTipo,
		midia: mediaData ? { ...mediaData, whatsappMediaId: incomingMessage.mediaId } : null,
		now: new Date(incomingMessage.timestamp),
	});

	// Reentrega da Meta: a mensagem já existe e todo o downstream (contador, pendência,
	// transcrição, gatilho de IA) já rodou na primeira entrega.
	if (!insertedMessage) {
		console.log("[WHATSAPP_WEBHOOK] Mensagem duplicada ignorada:", incomingMessage.whatsappMessageId);
		return;
	}

	console.log("[WHATSAPP_WEBHOOK] Message created from:", incomingMessage.fromPhoneNumber);

	// A transcrição/OCR de mídia é independente do atendimento: roda mesmo que a IA não
	// vá responder, porque o texto processado alimenta a busca e o contexto do humano.
	if (mediaData && midiaTipo !== "TEXTO") {
		await handleAIMediaProcessing(insertedMessage.messageId, mediaData.storageId, mediaData.mimeType, midiaTipo);
	}

	if (!allowsAIService) return;

	// Capability de plano. Antes só `hubAtendimentos.acesso` era checado, e o atendimento por
	// IA rodava para qualquer organização com um número habilitado.
	const hasAiServiceAccess = connectionPhone.conexao.organizacao?.configuracao?.recursos?.iaAtendimento?.acesso ?? false;
	if (!hasAiServiceAccess) {
		console.log("[WHATSAPP_WEBHOOK] Recurso de atendimento com IA indisponível para a organização:", organizacaoId);
		return;
	}

	// Provisionamento lazy: a primeira mensagem cria o agente da organização.
	const agent = await ensureOrganizationAgent(db, organizacaoId);
	if (agent.status !== "ATIVO") {
		console.log("[WHATSAPP_WEBHOOK] Agente de IA pausado para a organização:", organizacaoId);
		return;
	}

	// Debounce, claim, confirmação e run vivem no runner — o webhook só despacha.
	await dispatchAiTurn(
		{
			organizacaoId,
			chatId,
			mensagemGatilhoId: insertedMessage.messageId,
			mensagemGatilhoDataEnvio: insertedMessage.dataEnvio.toISOString(),
		},
		{ delayMs: agent.capacidades?.atendimento?.atrasoRespostaMs ?? AI_RESPONSE_DELAY_MS },
	);
}

/**
 * Handle message echoes from WhatsApp Business phone app (Coexistence)
 */
async function handleMessageEcho(body: WebhookBody): Promise<void> {
	const messageEcho = parseWebhookMessageEcho(body);
	if (!messageEcho) {
		console.error("[WHATSAPP_WEBHOOK] Failed to parse message echo");
		return;
	}

	// Find WhatsApp connection (including organization config)
	const connectionPhone = await db.query.whatsappConnectionPhones.findFirst({
		where: (fields, { eq }) => eq(fields.whatsappTelefoneId, messageEcho.whatsappPhoneNumberId),
		with: {
			conexao: {
				with: {
					organizacao: {
						columns: { configuracao: true },
					},
				},
			},
		},
	});

	if (!connectionPhone?.conexao) {
		console.warn("[WHATSAPP_WEBHOOK] [ECHO] No WhatsApp connection found");
		return;
	}

	const organizacaoId = connectionPhone.conexao.organizacaoId;
	const whatsappToken = connectionPhone.conexao.token!; // Meta Cloud API connections always have token
	const whatsappConexaoId = connectionPhone.conexaoId;
	const whatsappConexaoTelefoneId = connectionPhone.id;

	// ESTÁGIO 1 — IDENTIDADE, sem gate: o destinatário de um echo também é contato da base.
	const resolvedClient = await resolveWhatsappClient({
		organizacaoId,
		telefone: messageEcho.toPhoneNumber,
		whatsappUserId: messageEcho.toUserId,
	});
	if (!resolvedClient) {
		console.warn("[WHATSAPP_WEBHOOK] [ECHO] Echo sem identidade resolvível (sem telefone e sem BSUID):", messageEcho.whatsappMessageId);
		return;
	}
	const clientId = resolvedClient.clientId;

	// ESTÁGIO 2 — CONVERSA (gate do hub).
	const hasHubAccess = connectionPhone.conexao.organizacao?.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;
	if (!hasHubAccess) {
		console.log("[WHATSAPP_WEBHOOK] [ECHO] hubAtendimentos disabled, skipping message echo insertion");
		return;
	}

	const { chatId } = await resolveIncomingChat({
		organizacaoId,
		clienteId: clientId,
		whatsappTelefoneId: messageEcho.whatsappPhoneNumberId,
		whatsappConexaoId,
		whatsappConexaoTelefoneId,
	});

	// Download and store media if present
	let mediaData: {
		storageId: string;
		publicUrl: string;
		mimeType: string;
		fileSize: number;
	} | null = null;

	if (messageEcho.mediaId && messageEcho.mimeType) {
		try {
			mediaData = await downloadAndStoreWhatsappMedia({
				mediaId: messageEcho.mediaId,
				mimeType: messageEcho.mimeType,
				filename: messageEcho.filename,
				organizacaoId,
				chatId,
				whatsappToken,
			});
		} catch (error) {
			console.error("[WHATSAPP_WEBHOOK] [ECHO] Error downloading media:", error);
		}
	}

	// Determine media type
	let midiaTipo: "TEXTO" | "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO" = "TEXTO";
	if (messageEcho.messageType === "image") midiaTipo = "IMAGEM";
	else if (messageEcho.messageType === "document") midiaTipo = "DOCUMENTO";
	else if (messageEcho.messageType === "video") midiaTipo = "VIDEO";
	else if (messageEcho.messageType === "audio") midiaTipo = "AUDIO";

	// O echo marca o atendimento como EXTERNO ("atendido pelo telefone") — mas apenas se
	// nenhum humano do hub já for o dono, o que markChatAttendedExternally garante.
	const insertedEcho = await persistOutboundNonHubMessage({
		organizacaoId,
		chatId,
		clienteId: clientId,
		origem: "WHATSAPP_ECHO",
		whatsappMessageId: messageEcho.whatsappMessageId,
		conteudoTexto: messageEcho.textContent || messageEcho.caption || null,
		conteudoMidiaTipo: midiaTipo,
		midia: mediaData ? { ...mediaData, whatsappMediaId: messageEcho.mediaId } : null,
		now: new Date(messageEcho.timestamp),
	});
	if (!insertedEcho) {
		console.log("[WHATSAPP_WEBHOOK] [ECHO] Echo duplicado ignorado:", messageEcho.whatsappMessageId);
		return;
	}

	console.log("[WHATSAPP_WEBHOOK] [ECHO] Message echo created to:", messageEcho.toPhoneNumber);
}


/**
 * Process media with AI (transcription, image analysis, etc.)
 */
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
			console.error("[PROCESS_MEDIA] Download error:", downloadError);
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

		console.log("[MEDIA_PROCESSING] Completed for message:", messageId);

		return {
			sucess: true,
			processedText,
			summary,
		};
	} catch (error) {
		console.error("[MEDIA_PROCESSING] Error:", error);
		throw error;
	}
}
