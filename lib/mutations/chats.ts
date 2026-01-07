import type { TUpdateChatInput, TUpdateChatOutput } from "@/app/api/chats/[chatId]/route";
import type { TUpdateMessageInput, TUpdateMessageOutput } from "@/app/api/chats/messages/[messageId]/route";
import type { TCreateMessageInput, TCreateMessageOutput } from "@/app/api/chats/messages/route";
import type { TSendWhatsappInput, TSendWhatsappOutput } from "@/app/api/chats/messages/send-whatsapp/route";
import type { TCreateChatInput, TCreateChatOutput } from "@/app/api/chats/route";
import type { TUpdateServiceInput, TUpdateServiceOutput } from "@/app/api/chats/services/[serviceId]/route";
import type { TTransferServiceInput, TTransferServiceOutput } from "@/app/api/chats/services/[serviceId]/transfer/route";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

// ============= Mutation functions =============

async function createChat(input: TCreateChatInput): Promise<TCreateChatOutput> {
	const { data } = await axios.post<TCreateChatOutput>("/api/chats", input);
	return data;
}

async function updateChat(chatId: string, input: TUpdateChatInput): Promise<TUpdateChatOutput> {
	const { data } = await axios.patch<TUpdateChatOutput>(`/api/chats/${chatId}`, input);
	return data;
}

async function createMessage(input: TCreateMessageInput): Promise<TCreateMessageOutput> {
	const { data } = await axios.post<TCreateMessageOutput>("/api/chats/messages", input);
	return data;
}

async function updateMessage(messageId: string, input: TUpdateMessageInput): Promise<TUpdateMessageOutput> {
	const { data } = await axios.patch<TUpdateMessageOutput>(`/api/chats/messages/${messageId}`, input);
	return data;
}

async function sendWhatsapp(input: TSendWhatsappInput): Promise<TSendWhatsappOutput> {
	const { data } = await axios.post<TSendWhatsappOutput>("/api/chats/messages/send-whatsapp", input);
	return data;
}

export async function updateService(input: TUpdateServiceInput & { serviceId: string }): Promise<TUpdateServiceOutput> {
	const { data } = await axios.patch<TUpdateServiceOutput>(`/api/chats/services/${input.serviceId}`, { ...input });
	return data;
}

export async function transferService(input: TTransferServiceInput & { serviceId: string }): Promise<TTransferServiceOutput> {
	const { data } = await axios.patch<TTransferServiceOutput>(`/api/chats/services/${input.serviceId}/transfer`, { userId: input.userId });
	return data;
}

// ============= Hooks =============

/**
 * Hook to create or get a chat by client
 */
export function useCreateChat() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createChat,
		onSuccess: (data) => {
			// Invalidate chats list to refresh
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});
}

/**
 * Hook to mark messages as read
 */
export function useMarkMessagesAsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ chatId }: { chatId: string }) => updateChat(chatId, { action: "mark_as_read" }),
		onSuccess: (data, variables) => {
			// Invalidate chat to update unread count
			queryClient.invalidateQueries({ queryKey: ["chat", variables.chatId] });
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});
}

/**
 * Hook to update chat status
 */
export function useUpdateChatStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ chatId, status }: { chatId: string; status: "ABERTA" | "FECHADA" }) => updateChat(chatId, { action: "update_status", status }),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["chat", variables.chatId] });
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});
}

type CreateMessageParams = TCreateMessageInput & {
	sendToWhatsapp?: boolean;
};

/**
 * Hook to create a new message and optionally send via WhatsApp
 */
export function useCreateMessage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: CreateMessageParams) => {
			const { sendToWhatsapp = true, ...messageInput } = params;

			// Create message in database
			const messageResult = await createMessage(messageInput);

			// Send via WhatsApp if needed and chat is open
			if (sendToWhatsapp && messageResult.data.requiresWhatsappSend && messageResult.data.chat.status === "ABERTA") {
				try {
					if (messageResult.data.media) {
						// Send media message
						await sendWhatsapp({
							type: "media",
							messageId: messageResult.data.messageId,
							chatId: messageResult.data.chatId,
							storageId: messageResult.data.media.storageId,
							mediaType: messageResult.data.media.mimeType?.startsWith("image/")
								? "IMAGEM"
								: messageResult.data.media.mimeType?.startsWith("audio/")
									? "AUDIO"
									: messageResult.data.media.mimeType?.startsWith("video/")
										? "VIDEO"
										: "DOCUMENTO",
							mimeType: messageResult.data.media.mimeType ?? "application/octet-stream",
							filename: messageResult.data.media.filename,
							caption: messageInput.conteudoTexto,
						});
					} else if (messageInput.conteudoTexto) {
						// Send text message
						await sendWhatsapp({
							type: "text",
							messageId: messageResult.data.messageId,
							chatId: messageResult.data.chatId,
						});
					}
				} catch (error) {
					console.error("[CREATE_MESSAGE] WhatsApp send failed:", error);
					// Message is created but marked as failed - can be retried
				}
			}

			return messageResult;
		},
		onSuccess: (data) => {
			// Invalidate messages and chat to refresh
			queryClient.invalidateQueries({ queryKey: ["chat-messages", data.data.chatId] });
			queryClient.invalidateQueries({ queryKey: ["chat", data.data.chatId] });
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});
}

type CreateTemplateMessageParams = {
	chatId: string;
	templatePayload: unknown;
	templateContent: string;
};

/**
 * Hook to send a template message (for expired conversations)
 */
export function useCreateTemplateMessage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: CreateTemplateMessageParams) => {
			// First create the message in database
			const messageResult = await createMessage({
				chatId: params.chatId,
				conteudoTexto: params.templateContent,
				conteudoMidiaTipo: "TEXTO",
			});

			// Send template via WhatsApp
			const sendResult = await sendWhatsapp({
				type: "template",
				messageId: messageResult.data.messageId,
				chatId: params.chatId,
				templatePayload: params.templatePayload,
			});

			return { message: messageResult, send: sendResult };
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["chat-messages", data.message.data.chatId] });
			queryClient.invalidateQueries({ queryKey: ["chat", data.message.data.chatId] });
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});
}

/**
 * Hook to retry sending a failed message
 */
export function useRetryMessage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ messageId, chatId }: { messageId: string; chatId: string }) => {
			// Get message details to determine type
			const { data: messageResult } = await axios.get(`/api/chats/messages?chatId=${chatId}&limit=100`);
			const message = messageResult.data.items.find((m: { id: string }) => m.id === messageId);

			if (!message) {
				throw new Error("Mensagem não encontrada.");
			}

			// Reset status
			await updateMessage(messageId, { whatsappMessageStatus: "PENDENTE" });

			// Retry send
			if (message.conteudoMidiaStorageId && message.conteudoMidiaTipo !== "TEXTO") {
				return sendWhatsapp({
					type: "media",
					messageId,
					chatId,
					storageId: message.conteudoMidiaStorageId,
					mediaType: message.conteudoMidiaTipo,
					mimeType: message.conteudoMidiaMimeType || "application/octet-stream",
					filename: message.conteudoMidiaArquivoNome,
					caption: message.conteudoTexto,
				});
			}

			return sendWhatsapp({
				type: "text",
				messageId,
				chatId,
			});
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["chat-messages", variables.chatId] });
		},
	});
}

/**
 * Hook to update message status (for webhook updates)
 */
export function useUpdateMessageStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ messageId, ...input }: { messageId: string } & TUpdateMessageInput) => updateMessage(messageId, input),
		onSuccess: () => {
			// We don't know which chat, so invalidate all
			queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
		},
	});
}

/**
 * Hook to update service (conclude)
 */
export function useUpdateService() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ serviceId, ...input }: { serviceId: string } & TUpdateServiceInput) => updateService({ serviceId, ...input }),
		onSuccess: (data, variables) => {
			// Invalidate chat queries to refresh service status
			queryClient.invalidateQueries({ queryKey: ["chat"] });
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Erro ao concluir atendimento.");
		},
	});
}

/**
 * Hook to transfer service responsibility
 */
export function useTransferService() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: TTransferServiceInput & { serviceId: string }) => transferService(input),
		onSuccess: (data, variables) => {
			// Invalidate chat queries to refresh service status
			queryClient.invalidateQueries({ queryKey: ["chat"] });
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Erro ao transferir responsabilidade.");
		},
	});
}
