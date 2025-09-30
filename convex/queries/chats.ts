import { v } from "convex/values";
import { query } from "../_generated/server";

export const getUserByIdApp = query({
	args: {
		idApp: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("idApp"), args.idApp))
			.first();
		return user;
	},
});

export const getClientById = query({
	args: {
		clientId: v.id("clients"),
	},
	handler: async (ctx, args) => {
		const client = await ctx.db.get(args.clientId);
		return client;
	},
});

export const getUserChats = query({
	args: {
		userAppId: v.string(),
	},
	handler: async (ctx, args) => {
		console.log("[INFO][GET_USER_CHATS] Getting user chats for user app id:", args.userAppId);
		const userId = await ctx.db
			.query("users")
			.withIndex("by_idApp", (q) => q.eq("idApp", args.userAppId))
			.first();
		console.log("[INFO][GET_USER_CHATS] User found:", userId);
		if (!userId) {
			return [];
		}
		const chats = await ctx.db
			.query("chats")
			.withIndex("by_agente_id", (q) => q.eq("agenteId", userId?._id))
			.order("desc")
			.collect();

		// Popula com dados do cliente e agente
		const chatsWithData = await Promise.all(
			chats.map(async (chat) => {
				const client = await ctx.db.get(chat.clienteId);
				const agent = chat.agenteId ? await ctx.db.get(chat.agenteId) : null;
				return {
					...chat,
					cliente: client,
					agente: agent,
				};
			}),
		);

		// Ordena por última mensagem (mais recente primeiro)
		return chatsWithData.sort((a, b) => {
			const dateA = a.ultimaMensagemData || 0;
			const dateB = b.ultimaMensagemData || 0;
			return dateB - dateA;
		});
	},
});

export const getAllChats = query({
	args: {},
	handler: async (ctx) => {
		const chats = await ctx.db.query("chats").order("desc").collect();

		// Popula com dados do cliente e agente
		const chatsWithData = await Promise.all(
			chats.map(async (chat) => {
				const client = await ctx.db.get(chat.clienteId);
				const agent = chat.agenteId ? await ctx.db.get(chat.agenteId) : null;
				return {
					...chat,
					cliente: client,
					agente: agent,
				};
			}),
		);

		// Ordena por última mensagem (mais recente primeiro)
		return chatsWithData.sort((a, b) => {
			const dateA = a.ultimaMensagemData || 0;
			const dateB = b.ultimaMensagemData || 0;
			return dateB - dateA;
		});
	},
});

export const getChatMessagesByChatId = query({
	args: {
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("chatMessages")
			.withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
			.order("asc")
			.collect();

		// Popula com dados do autor
		const messagesWithAuthors = await Promise.all(
			messages.map(async (message) => {
				let autor = null;
				if (message.autorTipo === "USUARIO" && message.autorUsuarioId) {
					autor = await ctx.db.get(message.autorUsuarioId);
				} else if (message.autorTipo === "CLIENTE" && message.autorClienteId) {
					autor = await ctx.db.get(message.autorClienteId);
				}
				return {
					...message,
					autor,
				};
			}),
		);

		return messagesWithAuthors;
	},
});

export const getAllUsers = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("users").collect();
	},
});

export const getAllClients = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("clients").collect();
	},
});
