import z from "zod";
import {
	ChatMessageAuthorTypeEnum,
	ChatMessageContentTypeEnum,
	ChatMessageStatusEnum,
	ChatMessageWhatsappStatusEnum,
	ChatServiceResponsibleTypeEnum,
	ChatServiceStatusEnum,
	ChatStatusEnum,
} from "./enums";

export const ChatSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	clienteId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para o ID do cliente.",
	}),
	whatsappConexaoId: z
		.string({
			required_error: "ID da conexão do WhatsApp não informado.",
			invalid_type_error: "Tipo não válido para o ID da conexão do WhatsApp.",
		})
		.optional()
		.nullable(),
	whatsappConexaoTelefoneId: z
		.string({
			required_error: "ID do telefone da conexão do WhatsApp não informado.",
			invalid_type_error: "Tipo não válido para o ID do telefone da conexão do WhatsApp.",
		})
		.optional()
		.nullable(),
	whatsappTelefoneId: z.string({
		required_error: "ID do telefone do WhatsApp não informado.",
		invalid_type_error: "Tipo não válido para o ID do telefone do WhatsApp.",
	}),

	ultimaMensagemId: z
		.string({
			required_error: "ID da última mensagem não informado.",
			invalid_type_error: "Tipo não válido para o ID da última mensagem.",
		})
		.optional()
		.nullable(),
	ultimaMensagemData: z.number({
		required_error: "Data da última mensagem não informada.",
		invalid_type_error: "Tipo não válido para a data da última mensagem.",
	}),
	ultimaMensagemConteudoTipo: ChatMessageContentTypeEnum,
	ultimaMensagemConteudoTexto: z
		.string({
			required_error: "Texto da última mensagem não informado.",
			invalid_type_error: "Tipo não válido para o texto da última mensagem.",
		})
		.optional()
		.nullable(),
	status: ChatStatusEnum,
});

export const ChatServiceSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	chatId: z.string({
		required_error: "ID do chat não informado.",
		invalid_type_error: "Tipo não válido para o ID do chat.",
	}),
	clienteId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para o ID do cliente.",
	}),
	descricao: z.string({
		required_error: "Descrição do serviço não informada.",
		invalid_type_error: "Tipo não válido para a descrição do serviço.",
	}),
	status: ChatServiceStatusEnum,
	responsavelTipo: ChatServiceResponsibleTypeEnum,
	dataInicio: z.number({
		required_error: "Data de início do serviço não informada.",
		invalid_type_error: "Tipo não válido para a data de início do serviço.",
	}),
	dataFim: z
		.number({
			required_error: "Data de fim do serviço não informada.",
			invalid_type_error: "Tipo não válido para a data de fim do serviço.",
		})
		.optional()
		.nullable(),
});

export const ChatMessageSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	chatId: z.string({
		required_error: "ID do chat não informado.",
		invalid_type_error: "Tipo não válido para o ID do chat.",
	}),
	whatsappTemplateId: z
		.string({
			required_error: "ID do template do WhatsApp não informado.",
			invalid_type_error: "Tipo não válido para o ID do template do WhatsApp.",
		})
		.optional()
		.nullable(),
	autorTipo: ChatMessageAuthorTypeEnum,
	autorUsuarioId: z
		.string({
			required_error: "ID do usuário não informado.",
			invalid_type_error: "Tipo não válido para o ID do usuário.",
		})
		.optional()
		.nullable(),
	autorClienteId: z
		.string({
			required_error: "ID do cliente não informado.",
			invalid_type_error: "Tipo não válido para o ID do cliente.",
		})
		.optional()
		.nullable(),
	conteudoTexto: z.string({
		required_error: "Conteúdo da mensagem não informado.",
		invalid_type_error: "Tipo não válido para o conteúdo da mensagem.",
	}),
	// Media content fields
	conteudoMidiaUrl: z
		.string({
			required_error: "URL do conteúdo da mensagem não informado.",
			invalid_type_error: "Tipo não válido para a URL do conteúdo da mensagem.",
		})
		.optional()
		.nullable(),
	conteudoMidiaTipo: ChatMessageContentTypeEnum,
	conteudoMidiaStorageId: z
		.string({
			required_error: "ID do conteúdo da mensagem não informado.",
			invalid_type_error: "Tipo não válido para o ID do conteúdo da mensagem.",
		})
		.optional()
		.nullable(),
	conteudoMidiaMimeType: z
		.string({
			required_error: "MIME type do conteúdo da mensagem não informado.",
			invalid_type_error: "Tipo não válido para o MIME type do conteúdo da mensagem.",
		})
		.optional()
		.nullable(),
	conteudoMidiaArquivoNome: z
		.string({
			required_error: "Nome do arquivo do conteúdo da mensagem não informado.",
			invalid_type_error: "Tipo não válido para o nome do arquivo do conteúdo da mensagem.",
		})
		.optional()
		.nullable(),
	conteudoMidiaArquivoTamanho: z
		.number({
			required_error: "Tamanho do arquivo do conteúdo da mensagem não informado.",
			invalid_type_error: "Tipo não válido para o tamanho do arquivo do conteúdo da mensagem.",
		})
		.optional()
		.nullable(),
	conteudoMidiaTextoProcessado: z
		.string({
			required_error: "Texto processado do conteúdo da mensagem não informado.",
			invalid_type_error: "Tipo não válido para o texto processado do conteúdo da mensagem.",
		})
		.optional()
		.nullable(),
	conteudoMidiaTextoProcessadoResumo: z
		.string({
			required_error: "Resumo do texto processado do conteúdo da mensagem não informado.",
			invalid_type_error: "Tipo não válido para o resumo do texto processado do conteúdo da mensagem.",
		})
		.optional()
		.nullable(),
	conteudoMidiaWhatsappId: z
		.string({
			required_error: "ID do conteúdo da mensagem no WhatsApp não informado.",
			invalid_type_error: "Tipo não válido para o ID do conteúdo da mensagem no WhatsApp.",
		})
		.optional()
		.nullable(),
	status: ChatMessageStatusEnum,
	whatsappMessageId: z
		.string({
			required_error: "ID da mensagem no WhatsApp não informado.",
			invalid_type_error: "Tipo não válido para o ID da mensagem no WhatsApp.",
		})
		.optional()
		.nullable(),
	whatsappMessageStatus: ChatMessageWhatsappStatusEnum,
	servicoId: z
		.string({
			required_error: "ID do serviço não informado.",
			invalid_type_error: "Tipo não válido para o ID do serviço.",
		})
		.optional()
		.nullable(),
	dataEnvio: z.number({
		required_error: "Data de envio da mensagem não informada.",
		invalid_type_error: "Tipo não válido para a data de envio da mensagem.",
	}),
	isEcho: z
		.boolean({
			required_error: "Se a mensagem é um echo não informado.",
			invalid_type_error: "Tipo não válido para se a mensagem é um echo.",
		})
		.default(false),
});
