import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createChat = mutation({
	args: {
		agenteId: v.optional(v.id("users")),
		clienteId: v.id("clients"),
		canal: v.literal("WHATSAPP"),
	},
	handler: async (ctx, args) => {
		// Verifica se já existe um chat entre este agente e cliente
		const existingChat = await ctx.db
			.query("chats")
			.withIndex("by_cliente_id", (q) => q.eq("clienteId", args.clienteId))
			.filter((q) => q.eq(q.field("agenteId"), args.agenteId))
			.first();

		if (existingChat) {
			return existingChat._id;
		}

		const chatId = await ctx.db.insert("chats", {
			agenteId: args.agenteId,
			clienteId: args.clienteId,
			canal: args.canal,
			nMensagensNaoLidasUsuario: 0,
			nMensagensNaoLidasCliente: 0,
		});

		return chatId;
	},
});

export const assignChatToAgent = mutation({
	args: {
		chatId: v.id("chats"),
		agenteId: v.id("users"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.chatId, {
			agenteId: args.agenteId,
		});
		return args.chatId;
	},
});

export const updateChatUnreadCount = mutation({
	args: {
		chatId: v.id("chats"),
		nMensagensNaoLidasUsuario: v.optional(v.number()),
		nMensagensNaoLidasCliente: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { chatId, ...updates } = args;
		await ctx.db.patch(chatId, updates);
		return chatId;
	},
});
