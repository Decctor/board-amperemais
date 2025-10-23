import z from "zod";

export const WhatsappTemplateHeaderSchema = z.object({
	tipo: z.enum(["text", "image", "video", "document"], {
		required_error: "Tipo de cabeçalho não informado.",
		invalid_type_error: "Tipo inválido para cabeçalho.",
	}),
	conteudo: z.string({
		required_error: "Conteúdo do cabeçalho não informado.",
		invalid_type_error: "Tipo inválido para conteúdo do cabeçalho.",
	}),
	exemplo: z
		.string({
			invalid_type_error: "Tipo inválido para exemplo do cabeçalho.",
		})
		.optional()
		.nullable(),
});

export const WhatsappTemplateBodyParameterSchema = z.object({
	nome: z.string({
		required_error: "Nome do parâmetro não informado.",
		invalid_type_error: "Tipo inválido para nome do parâmetro.",
	}),
	exemplo: z.string({
		required_error: "Exemplo do parâmetro não informado.",
		invalid_type_error: "Tipo inválido para exemplo do parâmetro.",
	}),
});

export const WhatsappTemplateBodySchema = z.object({
	conteudo: z.string({
		required_error: "Conteúdo do corpo não informado.",
		invalid_type_error: "Tipo inválido para conteúdo do corpo.",
	}),
	parametros: z.array(WhatsappTemplateBodyParameterSchema, {
		invalid_type_error: "Tipo inválido para parâmetros do corpo.",
	}),
});

export const WhatsappTemplateFooterSchema = z.object({
	conteudo: z.string({
		required_error: "Conteúdo do rodapé não informado.",
		invalid_type_error: "Tipo inválido para conteúdo do rodapé.",
	}),
});

export const WhatsappTemplateButtonSchema = z.object({
	tipo: z.enum(["quick_reply", "url", "phone_number"], {
		required_error: "Tipo de botão não informado.",
		invalid_type_error: "Tipo inválido para botão.",
	}),
	texto: z.string({
		required_error: "Texto do botão não informado.",
		invalid_type_error: "Tipo inválido para texto do botão.",
	}),
	dados: z
		.object({
			url: z.string().optional().nullable(),
			telefone: z.string().optional().nullable(),
		})
		.optional()
		.nullable(),
});

export const WhatsappTemplateComponentsSchema = z.object({
	cabecalho: WhatsappTemplateHeaderSchema.optional().nullable(),
	corpo: WhatsappTemplateBodySchema,
	rodape: WhatsappTemplateFooterSchema.optional().nullable(),
	botoes: z
		.array(WhatsappTemplateButtonSchema, {
			invalid_type_error: "Tipo inválido para botões.",
		})
		.optional()
		.nullable(),
});

export const WhatsappTemplateSchema = z.object({
	nome: z
		.string({
			required_error: "Nome do template não informado.",
			invalid_type_error: "Tipo inválido para nome do template.",
		})
		.regex(/^[a-z0-9_]+$/, {
			message: "Nome do template deve conter apenas letras minúsculas, números e underscores.",
		})
		.max(512, { message: "Nome do template deve ter no máximo 512 caracteres." }),
	categoria: z.enum(["authentication", "marketing", "utility"], {
		required_error: "Categoria não informada.",
		invalid_type_error: "Tipo inválido para categoria.",
	}),
	idioma: z
		.string({
			required_error: "Idioma não informado.",
			invalid_type_error: "Tipo inválido para idioma.",
		})
		.default("pt_BR"),
	formatoParametros: z
		.enum(["named", "positional"], {
			invalid_type_error: "Tipo inválido para formato de parâmetros.",
		})
		.default("positional"),
	componentes: WhatsappTemplateComponentsSchema,
	status: z
		.enum(["RASCUNHO", "PENDENTE", "APROVADO", "REJEITADO", "PAUSADO", "DESABILITADO"], {
			invalid_type_error: "Tipo inválido para status.",
		})
		.default("RASCUNHO"),
	whatsappTemplateId: z
		.string({
			invalid_type_error: "Tipo inválido para ID do template no WhatsApp.",
		})
		.optional()
		.nullable(),
	qualidade: z
		.enum(["PENDENTE", "ALTA", "MEDIA", "BAIXA"], {
			invalid_type_error: "Tipo inválido para qualidade.",
		})
		.optional()
		.nullable(),
	motivoRejeicao: z
		.string({
			invalid_type_error: "Tipo inválido para motivo de rejeição.",
		})
		.optional()
		.nullable(),
	autorId: z.string({
		required_error: "ID do autor não informado.",
		invalid_type_error: "Tipo inválido para ID do autor.",
	}),
	dataInsercao: z
		.string({
			invalid_type_error: "Tipo inválido para data de inserção.",
		})
		.datetime({ message: "Formato inválido para data de inserção." }),
});

export type TWhatsappTemplate = z.infer<typeof WhatsappTemplateSchema>;
export type TWhatsappTemplateHeader = z.infer<typeof WhatsappTemplateHeaderSchema>;
export type TWhatsappTemplateBody = z.infer<typeof WhatsappTemplateBodySchema>;
export type TWhatsappTemplateFooter = z.infer<typeof WhatsappTemplateFooterSchema>;
export type TWhatsappTemplateButton = z.infer<typeof WhatsappTemplateButtonSchema>;
export type TWhatsappTemplateComponents = z.infer<typeof WhatsappTemplateComponentsSchema>;
export type TWhatsappTemplateBodyParameter = z.infer<typeof WhatsappTemplateBodyParameterSchema>;
