import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";

export const getChats = query({
	args: {
		whatsappPhoneNumberId: v.string(),
	},

	handler: async (ctx, args) => {
		const chats = await ctx.db
			.query("chats")
			.filter((q) => q.eq(q.field("whatsappTelefoneId"), args.whatsappPhoneNumberId))
			.collect();
		const enrichedChats = (
			await Promise.all(
				chats.map(async (chat) => {
					const chatClient = await ctx.db
						.query("clients")
						.filter((q) => q.eq(q.field("_id"), chat.clienteId))
						.first();
					if (!chatClient) throw new Error("Cliente não encontrado.");
					return {
						...chat,
						cliente: chatClient,
					};
				}),
			)
		).sort((a, b) => (b.ultimaMensagemData || 0) - (a.ultimaMensagemData || 0));
		return enrichedChats;
	},
});

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
			.filter((q) => q.eq(q.field("chatId"), args.chatId) && q.eq(q.field("status"), "PENDENTE"))
			.first();
		let chatOpenServiceResponsible: { nome: string; avatar_url: string | null } | "ai" | null = null;
		if (chatOpenService) {
			if (chatOpenService.responsavel && chatOpenService.responsavel === "ai") {
				chatOpenServiceResponsible = "ai";
			}
			if (chatOpenService.responsavel && chatOpenService.responsavel !== "ai") {
				console.log("Searching for service responsible...");
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

export const getChatMessages = query({
	args: {
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [CHAT] [GET_CHAT_MESSAGES] Getting chat messages for chat:", args.chatId);
		const messages = await ctx.db
			.query("messages")
			.filter((q) => q.eq(q.field("chatId"), args.chatId))
			.collect();

		const enrichedMessages = await Promise.all(
			messages.map(async (message) => {
				let messageAuthor: { nome: string; avatar_url: string | null } | null = null;
				if (message.autorTipo === "cliente") {
					const client = await ctx.db.get(message.autorId as Id<"clients">);
					if (!client) throw new Error("Cliente não encontrado.");
					messageAuthor = {
						nome: client.nome,
						avatar_url: client.avatar_url ?? null,
					};
				}
				if (message.autorTipo === "usuario") {
					const user = await ctx.db.get(message.autorId as Id<"users">);
					if (!user) throw new Error("Usuário não encontrado.");
					messageAuthor = {
						nome: user.nome,
						avatar_url: user.avatar_url ?? null,
					};
				}
				if (message.autorTipo === "ai") {
					messageAuthor = {
						nome: "AI",
						avatar_url: null,
					};
				}
				return {
					...message,
					autor: messageAuthor,
				};
			}),
		);
		return enrichedMessages;
	},
});

export const getChatSummary = internalQuery({
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
			.filter((q) => q.eq(q.field("chatId"), args.chatId) && q.eq(q.field("status"), "PENDENTE"))
			.first();

		return {
			id: chat._id,
			ultimaMensagemData: chat.ultimaMensagemData,
			cliente: {
				idApp: chatClient.idApp,
				nome: chatClient.nome,
				telefone: chatClient.telefone,
				email: chatClient.email,
				cpfCnpj: chatClient.cpfCnpj,
			},
			ultimasMensagens: chatLastOneHundredMessages.map((m) => ({
				id: m._id,
				autorTipo: m.autorTipo,
				conteudoTipo: m.conteudoMidiaTipo,
				conteudoTexto: m.conteudoTexto,
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
				: false,
		};
	},
});
