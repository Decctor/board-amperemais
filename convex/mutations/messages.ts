import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";
import { workflow } from "../workflows";

export const createMessage = mutation({
	args: {
		cliente: v.object({
			idApp: v.string(),
			nome: v.string(),
			cpfCnpj: v.optional(v.string()),
			telefone: v.string(),
			telefoneBase: v.string(),
			email: v.optional(v.string()),
			localizacaoCep: v.optional(v.string()),
			localizacaoEstado: v.optional(v.string()),
			localizacaoCidade: v.optional(v.string()),
			localizacaoBairro: v.optional(v.string()),
			localizacaoLogradouro: v.optional(v.string()),
			localizacaoNumero: v.optional(v.string()),
			localizacaoComplemento: v.optional(v.string()),
			avatar_url: v.optional(v.string()),
		}),
		autor: v.object({
			idApp: v.string(),
			tipo: v.union(v.literal("cliente"), v.literal("usuario")),
		}),
		conteudo: v.object({
			texto: v.optional(v.string()),
			midiaUrl: v.optional(v.string()),
			midiaTipo: v.optional(v.union(v.literal("IMAGEM"), v.literal("VIDEO"), v.literal("AUDIO"), v.literal("DOCUMENTO"))),
			midiaStorageId: v.optional(v.id("_storage")),
			midiaMimeType: v.optional(v.string()),
			midiaFileName: v.optional(v.string()),
			midiaFileSize: v.optional(v.number()),
			midiaWhatsappId: v.optional(v.string()),
		}),
		whatsappPhoneNumberId: v.string(),
		whatsappMessageId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [CREATE_MESSAGE] Creating message with args:", args);

		// Checkings before starting the process
		// We check if the whatsappMessageId is defined (is obligatory in case it came from a client)
		if (args.autor.tipo === "cliente" && !args.whatsappMessageId) {
			throw new Error("WhatsappMessageId não informado.");
		}

		let authorId: Id<"clients"> | Id<"users"> | null = null;
		let clientId: Id<"clients"> | null = null;

		// ## FIRST, DEFINING CLIENT AND AUTHOR DATA
		// Getting the clientId
		const client = await ctx.db
			.query("clients")
			.filter((q) => q.eq(q.field("idApp"), args.cliente.idApp))
			.first();
		if (!client) {
			// If client is not yet registered, we need to register it
			const insertClientResponse = await ctx.db.insert("clients", {
				...args.cliente,
			});
			clientId = insertClientResponse;
			// If the author is a client, we also define the authorId
			if (args.autor.tipo === "cliente") authorId = clientId;
		} else {
			clientId = client._id;
			// If the author is a client, we also define the authorId
			if (args.autor.tipo === "cliente") authorId = clientId;
		}
		// If clientId was not defined by any means, we need to throw an error
		if (!clientId) {
			throw new Error("Cliente não encontrado.");
		}
		// Getting the authorId
		if (!authorId) {
			// If no autorId was defined, we check if the autor is a user
			if (args.autor.tipo === "usuario") {
				const user = await ctx.db
					.query("users")
					.filter((q) => q.eq(q.field("idApp"), args.autor.idApp))
					.first();
				if (!user) {
					throw new Error("Usuário não encontrado.");
				}
				authorId = user._id;
			} else {
				// Else, it is a user but no user was found, them throw an error
				throw new Error("Autor não encontrado.");
			}
		}

		// ## SECOND, DEFINING CHAT DATA
		let chatId: Id<"chats"> | null = null;
		const chat = await ctx.db
			.query("chats")
			.filter((q) => q.eq(q.field("clienteId"), clientId))
			.first();
		if (!chat) {
			// If chat is not yet registered, we need to register it
			const insertChatResponse = await ctx.db.insert("chats", {
				clienteId: clientId,
				mensagensNaoLidas: 0,
				status: "ABERTA",
				whatsappTelefoneId: args.whatsappPhoneNumberId,
			});
			chatId = insertChatResponse;
		} else {
			// If chat is already registered, we get the its id
			chatId = chat._id;
		}

		// If chatId was not defined by any means, we need to throw an error
		if (!chatId) {
			throw new Error("Chat não encontrado.");
		}

		// ## THIRD, DEFINING SERVICE DATA
		let serviceId: Id<"services"> | null = null;
		let responsibleId: Id<"users"> | "ai" | undefined = undefined;

		const service = await ctx.db
			.query("services")
			.filter((q) => q.and(q.eq(q.field("chatId"), chatId), q.eq(q.field("status"), "PENDENTE")))
			.first();
		if (!service) {
			// If no service was found, we only create one
			const insertServiceResponse = await ctx.db.insert("services", {
				chatId: chatId,
				clienteId: clientId,
				descricao: "NÃO ESPECIFICADO",
				status: "PENDENTE",
				responsavel: args.autor.tipo === "usuario" ? (authorId as Id<"users">) : undefined, // Initializing the service with the correct responsible (AI if author is a client, user if author is a user)
				dataInicio: Date.now(),
			});
			serviceId = insertServiceResponse;
			responsibleId = args.autor.tipo === "usuario" ? (authorId as Id<"users">) : undefined;
		} else {
			// If service is already registered, we get the its id
			serviceId = service._id;
			if (args.autor.tipo === "usuario") {
				// If there is a service and the author of the message is a user, we update the service responsible
				await ctx.db.patch(serviceId, {
					responsavel: authorId as Id<"users">,
				});
				responsibleId = authorId as Id<"users">;
			} else {
				responsibleId = service.responsavel;
			}
		}

		// ## FOURTH, INSERTING MESSAGE
		const insertMessageResponse = await ctx.db.insert("messages", {
			chatId: chatId,
			autorTipo: args.autor.tipo,
			autorId: authorId,
			conteudoTexto: args.conteudo.texto,
			conteudoMidiaUrl: args.conteudo.midiaUrl,
			conteudoMidiaTipo: args.conteudo.midiaTipo,
			conteudoMidiaStorageId: args.conteudo.midiaStorageId,
			conteudoMidiaMimeType: args.conteudo.midiaMimeType,
			conteudoMidiaFileName: args.conteudo.midiaFileName,
			conteudoMidiaFileSize: args.conteudo.midiaFileSize,
			conteudoMidiaWhatsappId: args.conteudo.midiaWhatsappId,
			status: "ENVIADO",
			whatsappMessageId: args.whatsappMessageId,
			servicoId: serviceId ?? undefined,
			dataEnvio: Date.now(),
		});

		// ## FIFTH, UPDATING CHAT DATA
		// Updating chat embedded data
		const baseUpdateData = {
			ultimaMensagemId: insertMessageResponse,
			ultimaMensagemData: Date.now(),
			ultimaMensagemConteudoTexto: args.conteudo.texto,
			ultimaMensagemConteudoTipo: args.conteudo.midiaTipo ?? ("TEXTO" as const),
			mensagensNaoLidas: args.autor.tipo === "cliente" ? (chat?.mensagensNaoLidas ?? 0) + 1 : (chat?.mensagensNaoLidas ?? 0),
		};
		// If message is from client, we add additional data to the update
		if (args.autor.tipo === "cliente") {
			await ctx.db.patch(chatId, {
				...baseUpdateData,
				ultimaInteracaoClienteData: Date.now(),
				aiAgendamentoRespostaData: Date.now() + 3000, // 3 seconds from now
				status: "ABERTA" as const,
			});
		} else {
			// If message is from user, we update the chat with the base data only
			await ctx.db.patch(chatId, baseUpdateData);
		}

		// ## SIXTH, SCHEDULING
		// Schedule WhatsApp message send for user messages
		if (args.autor.tipo === "usuario" && (args.conteudo.texto || args.conteudo.midiaStorageId)) {
			const currentChat = await ctx.db.get(chatId);
			if (!currentChat) {
				throw new Error("Chat não encontrado após criação.");
			}
			// Check conversation state to decide message type
			if (currentChat.status === "ABERTA") {
				// Send regular message (text or media)
				if (args.conteudo.midiaStorageId) {
					// Send media message
					await ctx.scheduler.runAfter(500, internal.actions.whatsapp.sendWhatsappMediaMessage, {
						messageId: insertMessageResponse,
						phoneNumber: args.cliente.telefone,
						storageId: args.conteudo.midiaStorageId,
						mediaType: args.conteudo.midiaTipo,
						mimeType: args.conteudo.midiaMimeType,
						filename: args.conteudo.midiaFileName,
						caption: args.conteudo.texto,
						fromPhoneNumberId: args.whatsappPhoneNumberId,
					});
				} else if (args.conteudo.texto) {
					// Send text message
					await ctx.scheduler.runAfter(500, internal.actions.whatsapp.sendWhatsappMessage, {
						messageId: insertMessageResponse,
						phoneNumber: args.cliente.telefone,
						content: args.conteudo.texto,
						fromPhoneNumberId: args.whatsappPhoneNumberId,
					});
				}
			} else {
				// Conversation is expired, would need to send template
				// For now, we'll log this case - in production, you'd implement template sending
				console.log("[CREATE_MESSAGE] Conversation expired for chat:", chatId, "- template message would be needed");
				throw new Error("Conversa expirada. Por favor, envie um template para continuar.");
			}
		}

		// # AI WORKFLOW
		// Start AI processing workflow for both media and response generation
		const sendAIResponse = args.autor.tipo === "cliente" && responsibleId === "ai";
		const hasMedia = Boolean(args.conteudo.midiaStorageId && args.conteudo.midiaTipo);

		if (hasMedia || sendAIResponse) {
			await workflow.start(ctx, internal.workflows.aiProcessing.aiMessageProcessingWorkflow, {
				messageId: insertMessageResponse,
				chatId: chatId,
				media:
					hasMedia && args.conteudo.midiaStorageId && args.conteudo.midiaTipo
						? {
								storageId: args.conteudo.midiaStorageId,
								mediaType: args.conteudo.midiaTipo,
								mimeType: args.conteudo.midiaMimeType,
								filename: args.conteudo.midiaFileName,
							}
						: undefined,
				sendAIResponse: sendAIResponse,
			});
		}
		return {
			data: {
				insertedId: insertMessageResponse,
			},
			message: "Mensagem criada com sucesso.",
		};
	},
});

export const createTemplateMessage = mutation({
	args: {
		cliente: v.object({
			idApp: v.string(),
			nome: v.string(),
			cpfCnpj: v.optional(v.string()),
			email: v.optional(v.string()),
			telefone: v.string(),
			telefoneBase: v.string(),
			avatar_url: v.optional(v.string()),
		}),
		autor: v.object({
			idApp: v.string(),
			tipo: v.literal("usuario"),
		}),
		whatsappPhoneNumberId: v.string(),
		templateId: v.string(),
		templatePayloadData: v.any(),
		templatePayloadContent: v.string(),
	},
	handler: async (ctx, args) => {
		const { cliente, autor, whatsappPhoneNumberId, templateId, templatePayloadData, templatePayloadContent } = args;

		const user = await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("idApp"), args.autor.idApp))
			.first();
		if (!user) {
			throw new Error("Usuário não encontrado.");
		}
		const authorId = user._id;

		let clientId: Id<"clients"> | null = null;
		const client = await ctx.db
			.query("clients")
			.filter((q) => q.eq(q.field("idApp"), args.cliente.idApp))
			.first();
		if (!client) {
			// If client is not yet registered, we need to register it
			const insertClientResponse = await ctx.db.insert("clients", {
				...args.cliente,
				telefoneBase: args.cliente.telefoneBase,
			});
			clientId = insertClientResponse;
		} else {
			clientId = client._id;
		}
		if (!clientId) {
			// If clientId was not defined by any means, we need to throw an error
			throw new Error("Cliente não encontrado.");
		}
		// ## SECOND, DEFINING CHAT DATA
		let chatId: Id<"chats"> | null = null;
		const chat = await ctx.db
			.query("chats")
			.filter((q) => q.and(q.eq(q.field("whatsappTelefoneId"), whatsappPhoneNumberId), q.eq(q.field("clienteId"), clientId)))
			.first();
		if (!chat) {
			// If chat is not yet registered, we need to register it
			const insertChatResponse = await ctx.db.insert("chats", {
				clienteId: clientId,
				mensagensNaoLidas: 0,
				status: "ABERTA",
				whatsappTelefoneId: args.whatsappPhoneNumberId,
			});
			chatId = insertChatResponse;
		} else {
			// If chat is already registered, we get the its id
			chatId = chat._id;
		}

		// Insert message record
		const messageId = await ctx.db.insert("messages", {
			chatId: chatId,
			autorTipo: "usuario",
			autorId: user._id,
			conteudoTexto: templatePayloadContent,
			status: "ENVIADO",
			whatsappStatus: "PENDENTE",
			dataEnvio: Date.now(),
		});

		// Update chat
		await ctx.db.patch(chatId, {
			ultimaMensagemId: messageId,
			ultimaMensagemData: Date.now(),
			ultimaMensagemConteudoTexto: templatePayloadContent,
			status: "ABERTA", // Reopen conversation after template
			ultimaInteracaoClienteData: Date.now(), // Reset 24h timer
		});

		// Schedule template send via action
		await ctx.scheduler.runAfter(500, internal.actions.whatsapp.sendWhatsappTemplate, {
			messageId: messageId,
			phoneNumber: cliente.telefone,
			templatePayload: templatePayloadData,
			fromPhoneNumberId: whatsappPhoneNumberId,
		});

		return {
			data: {
				messageId,
			},
			message: "Template agendado para envio.",
		};
	},
});

export const updateMessageAfterSend = internalMutation({
	args: {
		messageId: v.id("messages"),
		whatsappMessageId: v.optional(v.string()),
		success: v.boolean(),
	},
	handler: async (ctx, args) => {
		console.log(`[INFO] [MESSAGES] [UPDATE_MESSAGE_AFTER_SEND] Updating message ${args.messageId}.`);
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Mensagem não encontrada.");
		}

		if (args.success && args.whatsappMessageId) {
			// Update message with WhatsApp message ID and mark as sent
			console.log(`[INFO] [MESSAGES] [UPDATE_MESSAGE_AFTER_SEND] Message ${args.messageId} sent successfully.`);
			await ctx.db.patch(args.messageId, {
				whatsappMessageId: args.whatsappMessageId,
				whatsappStatus: "ENVIADO",
			});
		} else {
			console.log(`[INFO] [MESSAGES] [UPDATE_MESSAGE_AFTER_SEND] Message ${args.messageId} failed to send.`);
			// Mark message as failed
			await ctx.db.patch(args.messageId, {
				whatsappStatus: "FALHOU",
			});
		}

		return { success: true };
	},
});

export const updateMessageStatus = mutation({
	args: {
		whatsappMessageId: v.string(),
		status: v.union(v.literal("ENVIADO"), v.literal("RECEBIDO"), v.literal("LIDO")),
		whatsappStatus: v.union(v.literal("PENDENTE"), v.literal("ENVIADO"), v.literal("ENTREGUE"), v.literal("FALHOU")),
	},
	handler: async (ctx, args) => {
		// Find message by WhatsApp message ID
		const message = await ctx.db
			.query("messages")
			.withIndex("by_whatsapp_message_id", (q) => q.eq("whatsappMessageId", args.whatsappMessageId))
			.first();

		if (!message) {
			console.log("[INFO] [MESSAGES] [UPDATE_MESSAGE_STATUS] Message not found for WhatsApp ID:", args.whatsappMessageId);
			return {
				success: false,
				message: "Mensagem não encontrada.",
			};
		}

		// Update message status
		await ctx.db.patch(message._id, {
			status: args.status,
			whatsappStatus: args.whatsappStatus,
		});

		console.log("[INFO] [MESSAGES] [UPDATE_MESSAGE_STATUS] Updated message:", message._id, "to status:", args.status);

		return {
			success: true,
			message: "Status da mensagem atualizado com sucesso.",
		};
	},
});

export const markMessagesAsRead = mutation({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [MESSAGES] [MARK_AS_READ] Marking messages as read for chat:", args.chatId, "user:", args.userId);

		// Get the chat to verify it exists
		const chat = await ctx.db.get(args.chatId);
		if (!chat) {
			console.log("[INFO] [MESSAGES] [MARK_AS_READ] Chat not found:", args.chatId);
			return {
				success: false,
				message: "Chat não encontrado.",
			};
		}

		// Get all unread messages from clients in this chat
		const messages = await ctx.db
			.query("messages")
			.filter((q) => q.eq(q.field("chatId"), args.chatId))
			.filter((q) => q.eq(q.field("autorTipo"), "cliente"))
			.filter((q) => q.neq(q.field("status"), "LIDO"))
			.collect();

		// Mark all client messages as read
		const updatePromises = messages.map((message) =>
			ctx.db.patch(message._id, {
				status: "LIDO",
			}),
		);

		await Promise.all(updatePromises);

		// Reset unread messages count in chat
		await ctx.db.patch(args.chatId, {
			mensagensNaoLidas: 0,
		});

		console.log("[INFO] [MESSAGES] [MARK_AS_READ] Marked", messages.length, "messages as read for chat:", args.chatId);

		return {
			success: true,
			message: `${messages.length} mensagens marcadas como lidas.`,
			markedCount: messages.length,
		};
	},
});

export const createAIMessage = internalMutation({
	args: {
		chatId: v.id("chats"),
		contentText: v.string(),
		serviceDescription: v.string(),
		serviceEscalation: v.object({
			applicable: v.boolean(),
			reason: v.optional(v.string()),
		}),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [MESSAGES] [CREATE_AI_MESSAGE] Creating AI message for chat:", args.chatId);

		// Get chat to get client info
		const chat = await ctx.db.get(args.chatId);
		if (!chat) {
			throw new Error("Chat não encontrado.");
		}

		const client = await ctx.db.get(chat.clienteId);
		if (!client) {
			throw new Error("Cliente não encontrado.");
		}

		// Find or get service
		let serviceId: Id<"services"> | undefined;
		const service = await ctx.db
			.query("services")
			.filter((q) => q.eq(q.field("chatId"), args.chatId))
			.filter((q) => q.eq(q.field("status"), "PENDENTE"))
			.first();
		if (!service) {
			let serviceResponsible: Id<"users"> | "ai" | undefined = "ai";
			if (args.serviceEscalation.applicable) {
				// Here we are getting the first user that can be found.
				// In the future, we should get the "default" transferable user
				const user = await ctx.db.query("users").first();
				serviceResponsible = user?._id;
			}
			const insertServiceResponse = await ctx.db.insert("services", {
				chatId: args.chatId,
				clienteId: chat.clienteId,
				descricao: args.serviceDescription,
				status: "PENDENTE",
				responsavel: serviceResponsible,
				dataInicio: Date.now(),
			});
			serviceId = insertServiceResponse;
		} else {
			serviceId = service._id;
			// Patching the existing service

			let serviceResponsible: Id<"users"> | "ai" | undefined = service.responsavel;

			if (args.serviceEscalation.applicable) {
				// Here we are getting the first user that can be found.
				// In the future, we should get the "default" transferable user
				const user = await ctx.db.query("users").first();
				serviceResponsible = user?._id;
			}
			await ctx.db.patch(service._id, {
				descricao: args.serviceDescription,
				responsavel: serviceResponsible,
			});
		}

		// Create the AI message
		const messageId = await ctx.db.insert("messages", {
			chatId: args.chatId,
			autorTipo: "ai",
			autorId: "ai-agent", // Special identifier for AI
			conteudoTexto: args.contentText,
			status: "ENVIADO",
			whatsappStatus: "PENDENTE",
			servicoId: serviceId,
			dataEnvio: Date.now(),
		});

		// Update chat
		await ctx.db.patch(args.chatId, {
			ultimaMensagemId: messageId,
			ultimaMensagemData: Date.now(),
			ultimaMensagemConteudoTexto: args.contentText,
			ultimaMensagemConteudoTipo: "TEXTO",
		});

		// Schedule WhatsApp message send
		await ctx.scheduler.runAfter(500, internal.actions.whatsapp.sendWhatsappMessage, {
			messageId: messageId,
			phoneNumber: client.telefone,
			content: args.contentText,
			fromPhoneNumberId: chat.whatsappTelefoneId,
		});

		console.log("[INFO] [MESSAGES] [CREATE_AI_MESSAGE] AI message created:", messageId);

		return {
			data: {
				messageId,
			},
			message: "Mensagem de IA criada com sucesso.",
		};
	},
});

export const updateMessageMediaProcessing = internalMutation({
	args: {
		messageId: v.id("messages"),
		conteudoMidiaTextoProcessado: v.optional(v.string()),
		conteudoMidiaTextoProcessadoResumo: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [MESSAGES] [UPDATE_MEDIA_PROCESSING] Updating message:", args.messageId);

		// Get message to verify it exists
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Mensagem não encontrada.");
		}

		// Update message with AI-processed content
		await ctx.db.patch(args.messageId, {
			conteudoMidiaTextoProcessado: args.conteudoMidiaTextoProcessado,
			conteudoMidiaTextoProcessadoResumo: args.conteudoMidiaTextoProcessadoResumo,
		});

		console.log("[INFO] [MESSAGES] [UPDATE_MEDIA_PROCESSING] Message updated successfully:", args.messageId);

		return {
			success: true,
			message: "Conteúdo de mídia processado com sucesso.",
		};
	},
});
