import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	whatsappConnections: defineTable({
		token: v.string(),
		dataExpiracao: v.number(),
		metaAutorAppId: v.string(),
		metaEscopo: v.array(v.string()),
		telefones: v.array(
			v.object({
				nome: v.string(),
				whatsappBusinessAccountId: v.string(),
				whatsappTelefoneId: v.string(),
				numero: v.string(),
			}),
		),
	}),
	users: defineTable({
		nome: v.string(),
		email: v.string(),
		avatar_url: v.optional(v.string()),
		telefone: v.optional(v.string()),
		idApp: v.string(),
	}),
	clients: defineTable({
		idApp: v.string(),
		nome: v.string(),
		cpfCnpj: v.optional(v.string()),
		// Communication
		telefone: v.string(),
		telefoneBase: v.string(),
		email: v.optional(v.string()),
		// Location
		localizacaoCep: v.optional(v.string()),
		localizacaoEstado: v.optional(v.string()),
		localizacaoCidade: v.optional(v.string()),
		localizacaoBairro: v.optional(v.string()),
		localizacaoLogradouro: v.optional(v.string()),
		localizacaoNumero: v.optional(v.string()),
		localizacaoComplemento: v.optional(v.string()),
		// Others
		avatar_url: v.optional(v.string()),
	})
		.index("by_idApp", ["idApp"])
		.searchIndex("search_by_name", {
			searchField: "nome",
			filterFields: ["idApp"],
		}),
	chats: defineTable({
		clienteId: v.id("clients"),
		whatsappTelefoneId: v.string(),
		mensagensNaoLidas: v.number(),
		ultimaMensagemId: v.optional(v.id("messages")),
		ultimaMensagemData: v.optional(v.number()),
		ultimaMensagemConteudoTipo: v.optional(
			v.union(v.literal("TEXTO"), v.literal("IMAGEM"), v.literal("VIDEO"), v.literal("AUDIO"), v.literal("DOCUMENTO")),
		),
		ultimaMensagemConteudoTexto: v.optional(v.string()),
		status: v.union(v.literal("ABERTA"), v.literal("EXPIRADA")),
		ultimaInteracaoClienteData: v.optional(v.number()),
		aiAgendamentoRespostaData: v.optional(v.number()),
	})
		.index("by_client_id", ["clienteId"])
		.index("by_whatsapp_phone_and_date", ["whatsappTelefoneId", "ultimaMensagemData"])
		.searchIndex("search_by_content", {
			searchField: "ultimaMensagemConteudoTexto",
			filterFields: ["whatsappTelefoneId", "status"],
		}),
	messages: defineTable({
		chatId: v.id("chats"),
		autorTipo: v.union(v.literal("cliente"), v.literal("usuario"), v.literal("ai")),
		autorId: v.union(v.id("clients"), v.id("users"), v.string()),
		conteudoTexto: v.optional(v.string()),
		// Media content fields
		conteudoMidiaUrl: v.optional(v.string()),
		conteudoMidiaTipo: v.optional(v.union(v.literal("IMAGEM"), v.literal("VIDEO"), v.literal("AUDIO"), v.literal("DOCUMENTO"))),
		conteudoMidiaStorageId: v.optional(v.id("_storage")), // Convex file storage reference
		conteudoMidiaMimeType: v.optional(v.string()),
		conteudoMidiaFileName: v.optional(v.string()),
		conteudoMidiaFileSize: v.optional(v.number()),
		conteudoMidiaTextoProcessado: v.optional(v.string()), // Complete AI-processed textual representation of media content
		conteudoMidiaTextoProcessadoResumo: v.optional(v.string()), // Summary of AI-processed media content
		conteudoMidiaWhatsappId: v.optional(v.string()), // WhatsApp media ID for incoming files
		status: v.union(v.literal("ENVIADO"), v.literal("RECEBIDO"), v.literal("LIDO")),
		whatsappMessageId: v.optional(v.string()),
		whatsappStatus: v.optional(v.union(v.literal("PENDENTE"), v.literal("ENVIADO"), v.literal("ENTREGUE"), v.literal("FALHOU"))),
		servicoId: v.optional(v.id("services")),
		dataEnvio: v.number(),
	})
		.index("by_chat_id", ["chatId"])
		.index("by_chat_and_date", ["chatId", "dataEnvio"])
		.index("by_author_id", ["autorId"])
		.index("by_whatsapp_message_id", ["whatsappMessageId"]),
	services: defineTable({
		chatId: v.id("chats"),
		clienteId: v.id("clients"),
		descricao: v.string(),
		status: v.union(v.literal("PENDENTE"), v.literal("EM_ANDAMENTO"), v.literal("CONCLUIDO")),
		responsavel: v.optional(v.union(v.id("users"), v.literal("ai"))),
		dataInicio: v.number(),
		dataFim: v.optional(v.number()),
	})
		.index("by_chat_id", ["chatId"])
		.index("by_client_id", ["clienteId"])
		.index("by_responsible_id", ["responsavel"])
		.index("by_status", ["status"]),
});
