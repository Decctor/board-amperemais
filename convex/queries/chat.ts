import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";
import { CHATS_PAGE_SIZE, MESSAGES_INITIAL_LOAD, MESSAGES_PAGE_SIZE, createCursor, paginationOptsValidator, parseCursor } from "../utils/pagination";

/**
 * Get paginated chats with optional search
 * Supports searching by client name or last message content
 */
export const getChats = query({
	args: {
		whatsappPhoneNumberId: v.string(),
		paginationOpts: v.optional(paginationOptsValidator),
		searchQuery: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { whatsappPhoneNumberId, searchQuery, paginationOpts } = args;
		const numItems = paginationOpts?.numItems ?? CHATS_PAGE_SIZE;
		const cursor = paginationOpts?.cursor;

		let chats: Array<any> = [];
		let hasMore = false;

		// Parse cursor if provided
		let cursorData: { timestamp: number; id: string } | null = null;
		if (cursor) {
			cursorData = parseCursor(cursor);
		}

		// If search query is provided, use search with client name lookup
		if (searchQuery && searchQuery.trim().length > 0) {
			// Search for clients by name
			const clientSearchResults = await ctx.db
				.query("clients")
				.withSearchIndex("search_by_name", (q) => q.search("nome", searchQuery))
				.take(100); // Get up to 100 matching clients

			const clientIds = clientSearchResults.map((c) => c._id);

			// Get chats for matching clients
			const chatsForMatchingClients = await ctx.db
				.query("chats")
				.filter((q) => q.eq(q.field("whatsappTelefoneId"), whatsappPhoneNumberId))
				.collect();

			// Filter by matching client IDs
			const filteredChats = chatsForMatchingClients.filter((chat) => clientIds.includes(chat.clienteId));

			// Also search in message content
			const messageContentSearch = await ctx.db
				.query("chats")
				.withSearchIndex("search_by_content", (q) => q.search("ultimaMensagemConteudoTexto", searchQuery).eq("whatsappTelefoneId", whatsappPhoneNumberId))
				.take(100);

			// Combine results and remove duplicates
			const chatMap = new Map();
			for (const chat of [...filteredChats, ...messageContentSearch]) {
				chatMap.set(chat._id, chat);
			}

			let allMatchingChats = Array.from(chatMap.values());

			// Sort by last message date (most recent first)
			allMatchingChats.sort((a, b) => (b.ultimaMensagemData || 0) - (a.ultimaMensagemData || 0));

			// Apply cursor pagination
			if (cursorData) {
				const cursorIndex = allMatchingChats.findIndex((chat) => chat._id === cursorData!.id);
				if (cursorIndex !== -1) {
					allMatchingChats = allMatchingChats.slice(cursorIndex + 1);
				}
			}

			// Take the page size + 1 to check if there are more
			chats = allMatchingChats.slice(0, numItems + 1);
			hasMore = chats.length > numItems;
			if (hasMore) {
				chats = chats.slice(0, numItems);
			}
		} else {
			// No search - use efficient indexed query
			let query = ctx.db
				.query("chats")
				.withIndex("by_whatsapp_phone_and_date", (q) => q.eq("whatsappTelefoneId", whatsappPhoneNumberId))
				.order("desc");

			// Apply cursor if provided
			if (cursorData) {
				query = query.filter((q) =>
					q.or(
						q.lt(q.field("ultimaMensagemData"), cursorData!.timestamp),
						q.and(q.eq(q.field("ultimaMensagemData"), cursorData!.timestamp), q.lt(q.field("_id"), cursorData!.id)),
					),
				);
			}

			// Take one extra to check if there are more results
			const results = await query.take(numItems + 1);
			hasMore = results.length > numItems;
			chats = hasMore ? results.slice(0, numItems) : results;
		}

		// Enrich chats with client data
		const enrichedChats = await Promise.all(
			chats.map(async (chat) => {
				const chatClient = await ctx.db.get(chat.clienteId);
				if (!chatClient) {
					console.error("Cliente não encontrado:", chat.clienteId);
					return null;
				}
				return {
					...chat,
					cliente: chatClient,
				};
			}),
		);

		// Filter out null values (chats without clients)
		const validChats = enrichedChats.filter((chat) => chat !== null);

		// Create next cursor from the last item
		let nextCursor: string | null = null;
		if (hasMore && validChats.length > 0) {
			const lastChat = validChats[validChats.length - 1];
			nextCursor = createCursor(lastChat.ultimaMensagemData || 0, lastChat._id);
		}

		return {
			items: validChats,
			hasMore,
			nextCursor,
		};
	},
});

/**
 * Get a single chat with enriched data
 */
export const getChat = query({
	args: {
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		const chat = await ctx.db.get(args.chatId);
		if (!chat) throw new Error("Chat não encontrado.");
		const chatClient = await ctx.db.get(chat.clienteId);
		if (!chatClient) throw new Error("Cliente não encontrado.");

		const chatOpenService = await ctx.db
			.query("services")
			.filter((q) => q.and(q.eq(q.field("chatId"), args.chatId), q.eq(q.field("status"), "PENDENTE")))
			.first();

		let chatOpenServiceResponsible: { nome: string; avatar_url: string | null } | "ai" | null = null;
		if (chatOpenService) {
			if (chatOpenService.responsavel && chatOpenService.responsavel === "ai") {
				chatOpenServiceResponsible = "ai";
			}
			if (chatOpenService.responsavel && chatOpenService.responsavel !== "ai") {
				const user = await ctx.db.get(chatOpenService.responsavel as Id<"users">);
				if (user) {
					chatOpenServiceResponsible = {
						nome: user.nome,
						avatar_url: user.avatar_url ?? null,
					};
				}
			}
		}

		const enrichedChat = {
			...chat,
			cliente: chatClient,
			atendimentoAberto: chatOpenService
				? {
						...chatOpenService,
						responsavel: chatOpenServiceResponsible,
					}
				: null,
		};
		return enrichedChat;
	},
});

export const getChatInternal = internalQuery({
	args: {
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		const chat = await ctx.db.get(args.chatId);
		if (!chat) throw new Error("Chat não encontrado.");
		const chatClient = await ctx.db.get(chat.clienteId);
		if (!chatClient) throw new Error("Cliente não encontrado.");
		const enrichedChat = {
			...chat,
			cliente: chatClient,
		};
		return enrichedChat;
	},
});
/**
 * Get paginated chat messages
 * Loads most recent messages first (reverse chronological)
 * Use cursor to load older messages
 */
export const getChatMessages = query({
	args: {
		chatId: v.id("chats"),
		paginationOpts: v.optional(paginationOptsValidator),
	},
	handler: async (ctx, args) => {
		const { chatId, paginationOpts } = args;
		const numItems = paginationOpts?.numItems ?? MESSAGES_INITIAL_LOAD;
		const cursor = paginationOpts?.cursor;

		console.log("[INFO] [CHAT] [GET_CHAT_MESSAGES] Getting chat messages for chat:", chatId);

		// Parse cursor if provided
		let cursorData: { timestamp: number; id: string } | null = null;
		if (cursor) {
			cursorData = parseCursor(cursor);
		}

		// Query messages with efficient index
		let query = ctx.db
			.query("messages")
			.withIndex("by_chat_and_date", (q) => q.eq("chatId", chatId))
			.order("desc"); // Most recent first

		// Apply cursor for pagination (loading older messages)
		if (cursorData) {
			query = query.filter((q) =>
				q.or(
					q.lt(q.field("dataEnvio"), cursorData!.timestamp),
					q.and(q.eq(q.field("dataEnvio"), cursorData!.timestamp), q.lt(q.field("_id"), cursorData!.id)),
				),
			);
		}

		// Take one extra to check if there are more results
		const messages = await query.take(numItems + 1);
		const hasMore = messages.length > numItems;
		const pageMessages = hasMore ? messages.slice(0, numItems) : messages;

		// Enrich messages with author data in a single pass
		// First, collect all unique author IDs by type
		const clientIds = new Set<Id<"clients">>();
		const userIds = new Set<Id<"users">>();

		for (const message of pageMessages) {
			if (message.autorTipo === "cliente") {
				clientIds.add(message.autorId as Id<"clients">);
			} else if (message.autorTipo === "usuario") {
				userIds.add(message.autorId as Id<"users">);
			}
		}

		// Batch fetch all clients and users
		const clients = await Promise.all(Array.from(clientIds).map((id) => ctx.db.get(id)));
		const users = await Promise.all(Array.from(userIds).map((id) => ctx.db.get(id)));

		// Create lookup maps
		const clientMap = new Map(clients.filter((c) => c !== null).map((c) => [c!._id, c!]));
		const userMap = new Map(users.filter((u) => u !== null).map((u) => [u!._id, u!]));

		// Enrich messages
		const enrichedMessages = pageMessages.map((message) => {
			let messageAuthor: { nome: string; avatar_url: string | null } | null = null;

			if (message.autorTipo === "cliente") {
				const client = clientMap.get(message.autorId as Id<"clients">);
				if (client) {
					messageAuthor = {
						nome: client.nome,
						avatar_url: client.avatar_url ?? null,
					};
				}
			} else if (message.autorTipo === "usuario") {
				const user = userMap.get(message.autorId as Id<"users">);
				if (user) {
					messageAuthor = {
						nome: user.nome,
						avatar_url: user.avatar_url ?? null,
					};
				}
			} else if (message.autorTipo === "ai") {
				messageAuthor = {
					nome: "AI",
					avatar_url: null,
				};
			}

			return {
				...message,
				autor: messageAuthor,
			};
		});

		// Reverse the order so oldest message is first (for display purposes)
		enrichedMessages.reverse();

		// Create cursor from the oldest message (which is now at the end after reversing)
		let nextCursor: string | null = null;
		if (hasMore && pageMessages.length > 0) {
			const oldestMessage = pageMessages[pageMessages.length - 1];
			nextCursor = createCursor(oldestMessage.dataEnvio, oldestMessage._id);
		}

		return {
			items: enrichedMessages,
			hasMore,
			nextCursor,
		};
	},
});
export const getChatSummary = query({
	args: {
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		const chat = await ctx.db.get(args.chatId);
		if (!chat) throw new Error("Chat não encontrado.");

		const chatClient = await ctx.db.get(chat.clienteId);
		if (!chatClient) throw new Error("Cliente não encontrado.");

		const chatLastOneHundredMessages = await ctx.db
			.query("messages")
			.filter((q) => q.eq(q.field("chatId"), args.chatId))
			.order("desc")
			.take(100);

		const chatOpenService = await ctx.db
			.query("services")
			.filter((q) => q.and(q.eq(q.field("chatId"), args.chatId), q.eq(q.field("status"), "PENDENTE")))
			.first();

		return {
			id: chat._id,
			ultimaMensagemData: chat.ultimaMensagemData,
			cliente: {
				idApp: chatClient.idApp,
				nome: chatClient.nome,
				cpfCnpj: chatClient.cpfCnpj,
				// Communication
				telefone: chatClient.telefone,
				telefoneBase: chatClient.telefoneBase,
				email: chatClient.email,
				// Location
				localizacaoCep: chatClient.localizacaoCep,
				localizacaoEstado: chatClient.localizacaoEstado,
				localizacaoCidade: chatClient.localizacaoCidade,
				localizacaoBairro: chatClient.localizacaoBairro,
				localizacaoLogradouro: chatClient.localizacaoLogradouro,
				localizacaoNumero: chatClient.localizacaoNumero,
				localizacaoComplemento: chatClient.localizacaoComplemento,
			},
			ultimasMensagens: chatLastOneHundredMessages.map((m) => ({
				id: m._id,
				autorTipo: m.autorTipo,
				conteudoTipo: m.conteudoMidiaTipo,
				conteudoTexto: m.conteudoTexto || `[${m.conteudoMidiaTipo}]: ${m.conteudoMidiaTextoProcessadoResumo}`,
				conteudoMidiaUrl: m.conteudoMidiaUrl,
				dataEnvio: m.dataEnvio,
				atendimentoId: m.servicoId,
			})),
			atendimentoAberto: chatOpenService
				? {
						id: chatOpenService._id,
						descricao: chatOpenService.descricao,
						status: chatOpenService.status,
					}
				: null,
		};
	},
});
