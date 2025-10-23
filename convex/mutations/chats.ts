import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";

export const getChatByClientAppId = mutation({
	args: {
		cliente: v.object({
			idApp: v.string(),
			nome: v.string(),
			cpfCnpj: v.optional(v.string()),
			email: v.optional(v.string()),
			telefone: v.string(),
			avatar_url: v.optional(v.string()),
		}),
		whatsappPhoneNumberId: v.string(),
	},
	handler: async (ctx, args) => {
		let clientId: Id<"clients"> | null = null;
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
		} else {
			clientId = client._id;
		}

		if (!clientId) {
			throw new Error("Cliente não encontrado.");
		}

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
				status: "EXPIRADA",
				whatsappTelefoneId: args.whatsappPhoneNumberId,
			});
			chatId = insertChatResponse;
		}
		if (!chatId) {
			throw new Error("Chat não encontrado.");
		}
		return {
			chatId: chatId,
			clientId: clientId,
		};
	},
});

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

export const updateExpiredChats = internalMutation({
	args: {},
	handler: async (ctx, args) => {
		const now = Date.now();
		const expirationThreshold = now - TWENTY_FOUR_HOURS_IN_MS;

		// Get all chats that are currently ABERTA
		const openChats = await ctx.db
			.query("chats")
			.filter((q) => q.eq(q.field("status"), "ABERTA"))
			.collect();

		let expiredCount = 0;

		for (const chat of openChats) {
			// If the last client interaction was more than 24h ago, expire the chat
			if (chat.ultimaInteracaoClienteData && chat.ultimaInteracaoClienteData < expirationThreshold) {
				await ctx.db.patch(chat._id, {
					status: "EXPIRADA",
				});
				expiredCount++;
				console.log("[INFO][CHATS] Expired chat:", chat._id);
			}
		}

		console.log(`[INFO][CHATS] Checked ${openChats.length} chats, expired ${expiredCount}`);

		return {
			checked: openChats.length,
			expired: expiredCount,
		};
	},
});
