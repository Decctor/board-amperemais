import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const sendMessage = mutation({
	args: {
		chatId: v.id("chats"),
		autorTipo: v.union(v.literal("USUARIO"), v.literal("CLIENTE")),
		autorUsuarioId: v.optional(v.id("users")),
		autorClienteId: v.optional(v.id("clients")),
		tipo: v.union(
			v.literal("TEXTO"),
			v.literal("IMAGEM"),
			v.literal("VIDEO"),
			v.literal("AUDIO"),
			v.literal("DOCUMENTO"),
			v.literal("STICKER"),
			v.literal("LOCALIZACAO"),
			v.literal("CONTATO"),
			v.literal("TEMPLATE"),
			v.literal("BOTAO_RESPOSTA"),
			v.literal("LISTA_RESPOSTA"),
			v.literal("SISTEMA"),
		),
		conteudoTexto: v.optional(v.string()),
		conteudoMidiaId: v.optional(v.string()),
		mensagemRespostaId: v.optional(v.id("chatMessages")),
		whatsappMensagemId: v.optional(v.string()),
		whatsappConversaId: v.optional(v.string()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const envioData = Date.now();

		const messageId = await ctx.db.insert("chatMessages", {
			chatId: args.chatId,
			autorTipo: args.autorTipo,
			autorUsuarioId: args.autorUsuarioId,
			autorClienteId: args.autorClienteId,
			tipo: args.tipo,
			conteudoTexto: args.conteudoTexto,
			conteudoMidiaId: args.conteudoMidiaId,
			mensagemRespostaId: args.mensagemRespostaId,
			whatsappMensagemId: args.whatsappMensagemId,
			whatsappConversaId: args.whatsappConversaId,
			envioData,
			metadata: args.metadata,
		});

		// Atualiza o chat com a última mensagem
		const chat = await ctx.db.get(args.chatId);
		if (chat) {
			const updates: any = {
				ultimaMensagemData: envioData,
				ultimaMensagemConteudo: args.conteudoTexto || `[${args.tipo}]`,
			};

			// Incrementa contador de não lidas
			if (args.autorTipo === "CLIENTE") {
				updates.nMensagensNaoLidasUsuario = (chat.nMensagensNaoLidasUsuario || 0) + 1;
			} else {
				updates.nMensagensNaoLidasCliente = (chat.nMensagensNaoLidasCliente || 0) + 1;
			}

			await ctx.db.patch(args.chatId, updates);
		}

		return messageId;
	},
});

export const markMessagesAsRead = mutation({
	args: {
		chatId: v.id("chats"),
		usuarioId: v.id("users"),
	},
	handler: async (ctx, args) => {
		// Busca mensagens não lidas do cliente neste chat
		const messages = await ctx.db
			.query("chatMessages")
			.withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
			.filter((q) => q.eq(q.field("autorTipo"), "CLIENTE"))
			.collect();

		const now = Date.now();

		// Cria recibos de leitura para mensagens que ainda não foram lidas por este usuário
		for (const message of messages) {
			const existingReceipt = await ctx.db
				.query("chatMessageReceipts")
				.withIndex("by_mensagem", (q) => q.eq("mensagemId", message._id))
				.filter((q) => q.eq(q.field("usuarioId"), args.usuarioId))
				.first();

			if (!existingReceipt) {
				await ctx.db.insert("chatMessageReceipts", {
					mensagemId: message._id,
					usuarioId: args.usuarioId,
					leituraData: now,
				});
			}
		}

		// Zera o contador de mensagens não lidas do usuário
		await ctx.db.patch(args.chatId, {
			nMensagensNaoLidasUsuario: 0,
		});

		return true;
	},
});
