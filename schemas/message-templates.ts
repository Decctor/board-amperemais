import z from "zod";
import { WhatsappTemplateCategoryEnum, WhatsappTemplateQualityEnum, WhatsappTemplateStatusEnum } from "./enums";
import { WhatsappTemplateComponentsSchema } from "./whatsapp-templates";

export const MessageTemplateGroupSchema = z.object({
	id: z.string(),
	organizacaoId: z.string(),
	nome: z
		.string({
			required_error: "Nome do grupo não informado.",
			invalid_type_error: "Tipo inválido para nome do grupo.",
		})
		.regex(/^[a-z0-9_]+$/, {
			message: "Nome deve conter apenas letras minúsculas, números e underscores.",
		})
		.max(512, { message: "Nome deve ter no máximo 512 caracteres." }),
	autorId: z.string({
		required_error: "ID do autor não informado.",
		invalid_type_error: "Tipo inválido para ID do autor.",
	}),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo inválido para data de inserção." })
		.datetime({ message: "Formato inválido para data de inserção." })
		.transform((val) => new Date(val)),
});
export type TMessageTemplateGroup = z.infer<typeof MessageTemplateGroupSchema>;

export const MessageTemplateVersionSchema = z.object({
	id: z.string(),
	grupoId: z.string({
		required_error: "ID do grupo não informado.",
		invalid_type_error: "Tipo inválido para ID do grupo.",
	}),
	versao: z.number({
		required_error: "Número da versão não informado.",
		invalid_type_error: "Tipo inválido para número da versão.",
	}),
	metaNome: z.string({
		required_error: "Nome Meta não informado.",
		invalid_type_error: "Tipo inválido para nome Meta.",
	}),
	categoria: WhatsappTemplateCategoryEnum,
	componentes: WhatsappTemplateComponentsSchema,
	autorId: z.string({
		required_error: "ID do autor não informado.",
		invalid_type_error: "Tipo inválido para ID do autor.",
	}),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo inválido para data de inserção." })
		.datetime({ message: "Formato inválido para data de inserção." })
		.transform((val) => new Date(val)),
});
export type TMessageTemplateVersion = z.infer<typeof MessageTemplateVersionSchema>;

export const MessageTemplateVersionPhoneSchema = z.object({
	id: z.string(),
	versaoId: z.string({
		required_error: "ID da versão não informado.",
		invalid_type_error: "Tipo inválido para ID da versão.",
	}),
	telefoneId: z.string({
		required_error: "ID do telefone não informado.",
		invalid_type_error: "Tipo inválido para ID do telefone.",
	}),
	whatsappTemplateId: z.string({ invalid_type_error: "Tipo inválido para ID do template WhatsApp." }).optional().nullable(),
	status: WhatsappTemplateStatusEnum,
	qualidade: WhatsappTemplateQualityEnum,
	rejeicao: z.string({ invalid_type_error: "Tipo inválido para rejeição." }).optional().nullable(),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo inválido para data de inserção." })
		.datetime({ message: "Formato inválido para data de inserção." })
		.transform((val) => new Date(val)),
	dataAtualizacao: z
		.string({ invalid_type_error: "Tipo inválido para data de atualização." })
		.datetime({ message: "Formato inválido para data de atualização." })
		.transform((val) => new Date(val)),
});
export type TMessageTemplateVersionPhone = z.infer<typeof MessageTemplateVersionPhoneSchema>;

// ─── Input schemas ────────────────────────────────────────────────────────────

export const CreateMessageTemplateVersionInputSchema = z.object({
	categoria: WhatsappTemplateCategoryEnum,
	componentes: WhatsappTemplateComponentsSchema,
});
export type TCreateMessageTemplateVersionInput = z.infer<typeof CreateMessageTemplateVersionInputSchema>;

export const CreateMessageTemplateInputSchema = z.object({
	grupo: z.object({
		nome: z
			.string({ required_error: "Nome do grupo não informado." })
			.regex(/^[a-z0-9_]+$/, { message: "Nome deve conter apenas letras minúsculas, números e underscores." })
			.max(512, { message: "Nome deve ter no máximo 512 caracteres." }),
	}),
	versoes: z.array(CreateMessageTemplateVersionInputSchema).min(1, { message: "Pelo menos uma versão é obrigatória." }),
});
export type TCreateMessageTemplateInput = z.infer<typeof CreateMessageTemplateInputSchema>;

export const AddMessageTemplateVersionInputSchema = z.object({
	grupoId: z.string({ required_error: "ID do grupo não informado.", invalid_type_error: "Tipo inválido para ID do grupo." }),
	versao: CreateMessageTemplateVersionInputSchema,
});
export type TAddMessageTemplateVersionInput = z.infer<typeof AddMessageTemplateVersionInputSchema>;

// ─── State schema (for form/modal) ────────────────────────────────────────────

export const MessageTemplateStateVersionSchema = z.object({
	categoria: WhatsappTemplateCategoryEnum,
	componentes: WhatsappTemplateComponentsSchema,
});
export type TMessageTemplateStateVersion = z.infer<typeof MessageTemplateStateVersionSchema>;

export const MessageTemplateStateSchema = z.object({
	grupo: z.object({ nome: z.string() }),
	versoes: z.array(MessageTemplateStateVersionSchema),
});
export type TMessageTemplateState = z.infer<typeof MessageTemplateStateSchema>;

// ─── Response shapes ──────────────────────────────────────────────────────────

export const MessageTemplateVersionPhoneStatusSchema = z.object({
	id: z.string(),
	versaoId: z.string(),
	telefoneId: z.string(),
	telefoneNumero: z.string().optional(),
	telefoneName: z.string().optional(),
	whatsappTemplateId: z.string().optional().nullable(),
	status: WhatsappTemplateStatusEnum,
	qualidade: WhatsappTemplateQualityEnum,
	rejeicao: z.string().optional().nullable(),
});
export type TMessageTemplateVersionPhoneStatus = z.infer<typeof MessageTemplateVersionPhoneStatusSchema>;

export const MessageTemplateVersionWithPhonesSchema = z.object({
	id: z.string(),
	grupoId: z.string(),
	versao: z.number(),
	metaNome: z.string(),
	categoria: WhatsappTemplateCategoryEnum,
	componentes: WhatsappTemplateComponentsSchema,
	dataInsercao: z.date().or(z.string()),
	statusGeral: WhatsappTemplateStatusEnum,
	qualidadeGeral: WhatsappTemplateQualityEnum,
	telefones: z.array(MessageTemplateVersionPhoneStatusSchema),
});
export type TMessageTemplateVersionWithPhones = z.infer<typeof MessageTemplateVersionWithPhonesSchema>;

export const MessageTemplateGroupWithVersionsSchema = z.object({
	id: z.string(),
	organizacaoId: z.string(),
	nome: z.string(),
	dataInsercao: z.date().or(z.string()),
	versoes: z.array(MessageTemplateVersionWithPhonesSchema),
	statusGeral: WhatsappTemplateStatusEnum,
	qualidadeGeral: WhatsappTemplateQualityEnum,
	variantCount: z.number(),
	approvedVariantCount: z.number(),
});
export type TMessageTemplateGroupWithVersions = z.infer<typeof MessageTemplateGroupWithVersionsSchema>;
