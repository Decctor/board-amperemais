import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	users: defineTable({
		idApp: v.string(),
		nome: v.string(),
		email: v.string(),
		senha: v.string(),
		avatar: v.optional(v.string()),
	})
		.index("by_email", ["email"])
		.index("by_idApp", ["idApp"]),
	clients: defineTable({
		idApp: v.string(),
		nome: v.string(),
		email: v.string(),
		telefone: v.string(),
		telefoneBase: v.string(),
		whatsappNome: v.optional(v.string()),
		whatsappId: v.optional(v.string()),
	})
		.index("by_email", ["email"])
		.index("by_whatsapp_id", ["whatsappId"])
		.index("by_telefone_base", ["telefoneBase"]),
	chats: defineTable({
		agenteId: v.optional(v.id("users")),
		clienteId: v.id("clients"),
		canal: v.literal("WHATSAPP"),
		nMensagensNaoLidasUsuario: v.optional(v.number()),
		nMensagensNaoLidasCliente: v.optional(v.number()),
		ultimaMensagemData: v.optional(v.number()),
		ultimaMensagemConteudo: v.optional(v.string()),
	})
		.index("by_agente_id", ["agenteId"])
		.index("by_cliente_id", ["clienteId"])
		.index("by_ultima_mensagem_data", ["ultimaMensagemData"]),

	chatMessages: defineTable({
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
		// CONTENT
		conteudoTexto: v.optional(v.string()),
		conteudoMidiaId: v.optional(v.string()), // fix

		// CONTENT REPLY
		mensagemRespostaId: v.optional(v.id("chatMessages")),

		// IDEMPOTENT
		whatsappMensagemId: v.optional(v.string()),
		whatsappConversaId: v.optional(v.string()),

		envioData: v.number(),
		metadata: v.optional(v.any()),
	})
		.index("by_chat_id", ["chatId"])
		.index("by_autor_usuario_id", ["autorUsuarioId"])
		.index("by_autor_cliente_id", ["autorClienteId"])
		.index("by_envio_data", ["envioData"])
		.index("by_whatsapp_mensagem_id", ["whatsappMensagemId"])
		.index("by_whatsapp_conversa_id", ["whatsappConversaId"]),
	chatMessageReceipts: defineTable({
		mensagemId: v.id("chatMessages"),
		usuarioId: v.id("users"),
		leituraData: v.number(),
	})
		.index("by_mensagem", ["mensagemId"])
		.index("by_usuario", ["usuarioId"]),
	midias: defineTable({
		tipo: v.union(v.literal("IMAGEM"), v.literal("VIDEO"), v.literal("AUDIO"), v.literal("DOCUMENTO")),
		nome: v.string(),
		whatsappUrl: v.optional(v.string()),
		formato: v.string(),
		arquivoId: v.id("_storage"),
	}),
});
