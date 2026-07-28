import { formatPhoneAsBase, formatStringAsOnlyDigits, formatToPhone } from "@/lib/formatting";
import type { TChatMessageDeliveryStatus } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { chatMessages, chats } from "@/services/drizzle/schema/chats";
import { clients } from "@/services/drizzle/schema/clients";
import { whatsappConnectionPhones } from "@/services/drizzle/schema/whatsapp-connections";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { fetchPhoneCoexistenceStatus } from "./smb-contacts-sync";

const META_GRAPH_API_VERSION = "v25.0";

type TMetaGraphError = {
	message?: string;
	code?: number;
	error_subcode?: number;
	fbtrace_id?: string;
	error_data?: {
		messaging_product?: string;
		details?: string;
	};
};

type TWhatsappHistoryContentType = "TEXTO" | "IMAGEM" | "VIDEO" | "AUDIO" | "DOCUMENTO";

type TParsedHistoryMessage = {
	whatsappPhoneNumberId: string;
	displayPhoneNumber: string | null;
	threadPhoneNumber: string;
	fromPhoneNumber: string;
	toPhoneNumber: string | null;
	whatsappMessageId: string;
	messageType: string;
	textContent: string;
	caption: string | null;
	mediaId: string | null;
	mimeType: string | null;
	filename: string | null;
	timestamp: number;
	historyStatus: string | null;
	isMediaAssetUpdate: boolean;
};

export type TWhatsappMessageHistoryEvent = {
	whatsappPhoneNumberId: string;
	displayPhoneNumber: string | null;
	metadata: {
		phase: number | null;
		chunkOrder: number | null;
		progress: number | null;
	} | null;
	errors: Array<{
		code?: number;
		title?: string;
		message?: string;
		details?: string;
	}>;
	messages: TParsedHistoryMessage[];
};

function getMetaSyncHistoryErrorMessage(error: TMetaGraphError | undefined) {
	const code = error?.code;
	const details = error?.error_data?.details?.trim() ?? "";
	const detailsLower = details.toLowerCase();

	if (code === 2593109 || detailsLower.includes("history sharing is turned off") || detailsLower.includes("history sync is turned off")) {
		return "O compartilhamento do histórico está desativado no WhatsApp Business. Ative o compartilhamento de histórico no app e tente novamente.";
	}
	if (detailsLower.includes("24 hours") || detailsLower.includes("time window")) {
		return "O prazo para solicitar o histórico deste onboarding expirou. Desconecte o número no app WhatsApp Business e reconecte pelo Recompra CRM para iniciar um novo onboarding.";
	}

	return details || error?.message || "Não foi possível solicitar o histórico de mensagens na Meta.";
}

function throwMetaSyncHistoryError(error: TMetaGraphError | undefined) {
	const message = getMetaSyncHistoryErrorMessage(error);
	console.error("[SMB_MESSAGE_HISTORY_SYNC] Meta API error:", {
		code: error?.code,
		errorSubcode: error?.error_subcode,
		details: error?.error_data?.details,
		fbtraceId: error?.fbtrace_id,
		message: error?.message,
	});

	const httpError = createHttpError(400, message);
	httpError.expose = true;
	throw httpError;
}

export async function requestSmbAppMessageHistorySync(phoneNumberId: string, accessToken: string) {
	const response = await fetch(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${phoneNumberId}/smb_app_data`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			messaging_product: "whatsapp",
			sync_type: "history",
		}),
	});
	const result = (await response.json()) as {
		request_id?: string;
		error?: TMetaGraphError;
	};

	if (!response.ok) {
		throwMetaSyncHistoryError(result.error);
	}

	return { requestId: result.request_id ?? null };
}

export async function triggerSmbAppMessageHistorySync({ phoneNumberId, accessToken }: { phoneNumberId: string; accessToken: string }) {
	const coexistenceStatus = await fetchPhoneCoexistenceStatus(phoneNumberId, accessToken);
	if (!coexistenceStatus.isOnBizApp) {
		return {
			requested: false,
			requestId: null,
			reason: "NOT_COEXISTENCE" as const,
			platformType: coexistenceStatus.platformType,
		};
	}

	const { requestId } = await requestSmbAppMessageHistorySync(phoneNumberId, accessToken);
	return {
		requested: true,
		requestId,
		reason: null,
		platformType: coexistenceStatus.platformType,
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
	return typeof value === "string" && value.trim() ? value : null;
}

function formatWhatsappHistoryPhone(value: string | null) {
	return value ? formatToPhone(value) : "";
}

function mapMetaMessageTypeToContentType(messageType: string): TWhatsappHistoryContentType {
	if (messageType === "image") return "IMAGEM";
	if (messageType === "video") return "VIDEO";
	if (messageType === "audio") return "AUDIO";
	if (messageType === "document") return "DOCUMENTO";
	return "TEXTO";
}

function mapHistoryStatusToDeliveryStatus(status: string | null): TChatMessageDeliveryStatus {
	const normalizedStatus = status?.toUpperCase();
	if (normalizedStatus === "READ" || normalizedStatus === "PLAYED") return "LIDA";
	if (normalizedStatus === "DELIVERED") return "ENTREGUE";
	if (normalizedStatus === "SENT") return "ENVIADA";
	if (normalizedStatus === "FAILED") return "FALHA";
	return "ENVIADA";
}

function parseHistoryMessage({
	messageValue,
	whatsappPhoneNumberId,
	displayPhoneNumber,
	threadPhoneNumber,
	isMediaAssetUpdate,
}: {
	messageValue: unknown;
	whatsappPhoneNumberId: string;
	displayPhoneNumber: string | null;
	threadPhoneNumber: string;
	isMediaAssetUpdate: boolean;
}): TParsedHistoryMessage | null {
	const message = asRecord(messageValue);
	if (!message) return null;

	const whatsappMessageId = readString(message.id);
	const messageType = readString(message.type);
	const fromPhoneNumber = readString(message.from);
	if (!whatsappMessageId || !messageType || !fromPhoneNumber) return null;

	const historyContext = asRecord(message.history_context);
	const typedContent = asRecord(message[messageType]);
	const text = asRecord(message.text);
	const mediaContent = messageType === "media_placeholder" ? null : typedContent;

	return {
		whatsappPhoneNumberId,
		displayPhoneNumber,
		threadPhoneNumber,
		fromPhoneNumber,
		toPhoneNumber: readString(message.to),
		whatsappMessageId,
		messageType,
		textContent: readString(text?.body) ?? "",
		caption: readString(mediaContent?.caption),
		mediaId: readString(mediaContent?.id),
		mimeType: readString(mediaContent?.mime_type),
		filename: readString(mediaContent?.filename),
		timestamp: message.timestamp ? Number.parseInt(String(message.timestamp), 10) * 1000 : Date.now(),
		historyStatus: readString(historyContext?.status),
		isMediaAssetUpdate,
	};
}

function parseHistoryErrors(errorsValue: unknown): TWhatsappMessageHistoryEvent["errors"] {
	const errors = Array.isArray(errorsValue) ? errorsValue : [];
	return errors
		.map((errorValue) => {
			const error = asRecord(errorValue);
			if (!error) return null;
			const errorData = asRecord(error.error_data);
			return {
				code: typeof error.code === "number" ? error.code : undefined,
				title: readString(error.title) ?? undefined,
				message: readString(error.message) ?? undefined,
				details: readString(errorData?.details) ?? undefined,
			};
		})
		.filter((error): error is NonNullable<typeof error> => !!error);
}

export function parseWhatsappMessageHistoryWebhook(webhookPayload: unknown): TWhatsappMessageHistoryEvent[] {
	const payload = asRecord(webhookPayload);
	const entries = Array.isArray(payload?.entry) ? payload.entry : [];
	const events: TWhatsappMessageHistoryEvent[] = [];

	for (const entryValue of entries) {
		const entry = asRecord(entryValue);
		const changes = Array.isArray(entry?.changes) ? entry.changes : [];

		for (const changeValue of changes) {
			const change = asRecord(changeValue);
			if (change?.field !== "history") continue;

			const value = asRecord(change.value);
			const metadata = asRecord(value?.metadata);
			const whatsappPhoneNumberId = readString(metadata?.phone_number_id);
			if (!whatsappPhoneNumberId) continue;

			const displayPhoneNumber = readString(metadata?.display_phone_number);
			const messages: TParsedHistoryMessage[] = [];
			const historyBlocks = Array.isArray(value?.history) ? value.history : [];
			const mediaAssetMessages = Array.isArray(value?.messages) ? value.messages : [];

			for (const historyBlockValue of historyBlocks) {
				const historyBlock = asRecord(historyBlockValue);
				const historyMetadata = asRecord(historyBlock?.metadata);
				const threads = Array.isArray(historyBlock?.threads) ? historyBlock.threads : [];

				for (const threadValue of threads) {
					const thread = asRecord(threadValue);
					const threadPhoneNumber = readString(thread?.id);
					if (!threadPhoneNumber) continue;

					const threadMessages = Array.isArray(thread?.messages) ? thread.messages : [];
					for (const messageValue of threadMessages) {
						const parsedMessage = parseHistoryMessage({
							messageValue,
							whatsappPhoneNumberId,
							displayPhoneNumber,
							threadPhoneNumber,
							isMediaAssetUpdate: false,
						});
						if (parsedMessage) messages.push(parsedMessage);
					}
				}

				events.push({
					whatsappPhoneNumberId,
					displayPhoneNumber,
					metadata: {
						phase: typeof historyMetadata?.phase === "number" ? historyMetadata.phase : null,
						chunkOrder: typeof historyMetadata?.chunk_order === "number" ? historyMetadata.chunk_order : null,
						progress: typeof historyMetadata?.progress === "number" ? historyMetadata.progress : null,
					},
					errors: parseHistoryErrors(historyBlock?.errors),
					messages: [...messages],
				});
				messages.length = 0;
			}

			const mediaMessages = mediaAssetMessages
				.map((messageValue) => {
					const message = asRecord(messageValue);
					const fromPhoneNumber = readString(message?.from);
					return parseHistoryMessage({
						messageValue,
						whatsappPhoneNumberId,
						displayPhoneNumber,
						threadPhoneNumber: fromPhoneNumber ?? "",
						isMediaAssetUpdate: true,
					});
				})
				.filter((message): message is TParsedHistoryMessage => !!message);

			if (mediaMessages.length > 0 || historyBlocks.length === 0) {
				events.push({
					whatsappPhoneNumberId,
					displayPhoneNumber,
					metadata: null,
					errors: [],
					messages: mediaMessages,
				});
			}
		}
	}

	return events;
}

function isBusinessAuthoredMessage(message: TParsedHistoryMessage) {
	const fromDigits = formatStringAsOnlyDigits(message.fromPhoneNumber);
	const displayDigits = formatStringAsOnlyDigits(message.displayPhoneNumber ?? "");
	return !!message.toPhoneNumber || (!!displayDigits && fromDigits === displayDigits);
}

async function findOrCreateHistoryClient({
	organizationId,
	phoneNumber,
}: {
	organizationId: string;
	phoneNumber: string;
}) {
	const phoneBase = formatPhoneAsBase(phoneNumber);
	const existingClient = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.telefoneBase, phoneBase), eq(fields.organizacaoId, organizationId)),
	});

	if (existingClient) return existingClient.id;

	const formattedPhone = formatWhatsappHistoryPhone(phoneNumber);
	const [newClient] = await db
		.insert(clients)
		.values({
			organizacaoId: organizationId,
			nome: formattedPhone || phoneNumber,
			telefone: formattedPhone || phoneNumber,
			telefoneBase: phoneBase || formatStringAsOnlyDigits(phoneNumber),
			canalAquisicao: "WHATSAPP",
		})
		.returning({ id: clients.id });

	return newClient.id;
}

async function findOrCreateHistoryChat({
	organizationId,
	clientId,
	connectionId,
	connectionPhoneId,
	whatsappPhoneNumberId,
	messageDate,
}: {
	organizationId: string;
	clientId: string;
	connectionId: string;
	connectionPhoneId: string;
	whatsappPhoneNumberId: string;
	messageDate: Date;
}) {
	const existingChat = await db.query.chats.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizationId), eq(fields.clienteId, clientId), eq(fields.whatsappTelefoneId, whatsappPhoneNumberId)),
	});

	if (existingChat) return existingChat;

	const [newChat] = await db
		.insert(chats)
		.values({
			organizacaoId: organizationId,
			clienteId: clientId,
			whatsappConexaoId: connectionId,
			whatsappConexaoTelefoneId: connectionPhoneId,
			whatsappTelefoneId: whatsappPhoneNumberId,
			mensagensNaoLidas: 0,
			ultimaMensagemData: messageDate,
		})
		.returning();

	return newChat;
}

function getHistoryMessageText(message: TParsedHistoryMessage) {
	if (message.textContent) return message.textContent;
	if (message.caption) return message.caption;
	if (message.messageType === "media_placeholder") return "[Mídia do histórico aguardando detalhes]";
	return "";
}

async function upsertHistoryMessage({
	message,
	organizationId,
	connectionId,
	connectionPhoneId,
}: {
	message: TParsedHistoryMessage;
	organizationId: string;
	connectionId: string;
	connectionPhoneId: string;
}) {
	const existingMessage = await db.query.chatMessages.findFirst({
		where: and(eq(chatMessages.organizacaoId, organizationId), eq(chatMessages.whatsappMessageId, message.whatsappMessageId)),
	});
	const contentType = mapMetaMessageTypeToContentType(message.messageType);

	if (existingMessage) {
		if (!message.isMediaAssetUpdate || contentType === "TEXTO") return { inserted: false, updated: false };

		await db
			.update(chatMessages)
			.set({
				conteudoTexto: getHistoryMessageText(message),
				conteudoMidiaTipo: contentType,
				conteudoMidiaMimeType: message.mimeType,
				conteudoMidiaArquivoNome: message.filename,
				conteudoMidiaWhatsappId: message.mediaId,
			})
			.where(eq(chatMessages.id, existingMessage.id));

		return { inserted: false, updated: true };
	}
	if (message.isMediaAssetUpdate) {
		return { inserted: false, updated: false };
	}

	const isBusinessMessage = isBusinessAuthoredMessage(message);
	const clientPhoneNumber = isBusinessMessage ? (message.toPhoneNumber ?? message.threadPhoneNumber) : message.fromPhoneNumber;
	const clientId = await findOrCreateHistoryClient({ organizationId, phoneNumber: clientPhoneNumber });
	const messageDate = new Date(message.timestamp);
	const chat = await findOrCreateHistoryChat({
		organizationId,
		clientId,
		connectionId,
		connectionPhoneId,
		whatsappPhoneNumberId: message.whatsappPhoneNumberId,
		messageDate,
	});

	const [insertedMessage] = await db
		.insert(chatMessages)
		.values({
			organizacaoId: organizationId,
			chatId: chat.id,
			autorTipo: isBusinessMessage ? "BUSINESS-APP" : "CLIENTE",
			autorClienteId: isBusinessMessage ? null : clientId,
			conteudoTexto: getHistoryMessageText(message),
			conteudoMidiaTipo: contentType,
			conteudoMidiaMimeType: message.mimeType,
			conteudoMidiaArquivoNome: message.filename,
			conteudoMidiaWhatsappId: message.mediaId,
			clienteId: clientId,
			whatsappMessageId: message.whatsappMessageId,
			statusEntrega: mapHistoryStatusToDeliveryStatus(message.historyStatus),
			dataEnvio: messageDate,
			whatsappEcho: isBusinessMessage,
		})
		.returning({ id: chatMessages.id, dataEnvio: chatMessages.dataEnvio });

	const shouldUpdateLastMessage = !chat.ultimaMensagemData || chat.ultimaMensagemData <= messageDate;
	if (shouldUpdateLastMessage) {
		await db
			.update(chats)
			.set({
				ultimaMensagemId: insertedMessage.id,
				ultimaMensagemData: insertedMessage.dataEnvio,
				// Histórico importado alimenta as datas de entrada/saída, mas NÃO cria
				// atendimento: uma conversa arquivada não é uma pendência do hub.
				...(isBusinessMessage
					? { ultimaMensagemSaidaData: insertedMessage.dataEnvio }
					: { ultimaMensagemEntradaData: insertedMessage.dataEnvio }),
				whatsappConexaoId: connectionId,
				whatsappConexaoTelefoneId: connectionPhoneId,
			})
			.where(eq(chats.id, chat.id));
	}

	return { inserted: true, updated: false };
}

export async function importWhatsappMessageHistoryEvents(events: TWhatsappMessageHistoryEvent[]) {
	let insertedCount = 0;
	let updatedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	for (const event of events) {
		if (event.errors.length > 0) {
			errorCount += event.errors.length;
			console.warn("[WHATSAPP_WEBHOOK] [MESSAGE_HISTORY] History sync errors:", {
				whatsappPhoneNumberId: event.whatsappPhoneNumberId,
				errors: event.errors,
			});
		}

		const connectionPhone = await db.query.whatsappConnectionPhones.findFirst({
			where: eq(whatsappConnectionPhones.whatsappTelefoneId, event.whatsappPhoneNumberId),
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
			skippedCount += event.messages.length;
			console.warn("[WHATSAPP_WEBHOOK] [MESSAGE_HISTORY] No WhatsApp connection found for:", event.whatsappPhoneNumberId);
			continue;
		}

		const hasHubAccess = connectionPhone.conexao.organizacao?.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;
		if (!hasHubAccess) {
			skippedCount += event.messages.length;
			console.log("[WHATSAPP_WEBHOOK] [MESSAGE_HISTORY] hubAtendimentos disabled, skipping history import for:", event.whatsappPhoneNumberId);
			continue;
		}

		const organizationId = connectionPhone.conexao.organizacaoId;
		await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`whatsapp-message-history:${organizationId}:${event.whatsappPhoneNumberId}`}))`);

		for (const message of event.messages) {
			const result = await upsertHistoryMessage({
				message,
				organizationId,
				connectionId: connectionPhone.conexaoId,
				connectionPhoneId: connectionPhone.id,
			});

			if (result.inserted) insertedCount += 1;
			else if (result.updated) updatedCount += 1;
			else skippedCount += 1;
		}

		console.log("[WHATSAPP_WEBHOOK] [MESSAGE_HISTORY] Chunk processed:", {
			whatsappPhoneNumberId: event.whatsappPhoneNumberId,
			organizationId,
			metadata: event.metadata,
			messageCount: event.messages.length,
		});
	}

	return { insertedCount, updatedCount, skippedCount, errorCount };
}
