import z from "zod";
import { CustomFieldEntityEnum, CustomFieldTypeEnum } from "./enums";

/**
 * Uma opção de um campo de escolha (única ou múltipla). `valor` é o que fica gravado no
 * `client_custom_field_values.valor`; `titulo` é o que o cliente lê. `legenda` e `icone`
 * existem para os renderizadores curados do assistente de cadastro do ponto de interação.
 */
export const CustomFieldOptionSchema = z.object({
	valor: z.string({
		required_error: "Valor da opção do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o valor da opção do campo personalizado.",
	}),
	titulo: z.string({
		required_error: "Título da opção do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o título da opção do campo personalizado.",
	}),
	legenda: z
		.string({
			required_error: "Legenda da opção do campo personalizado não informada.",
			invalid_type_error: "Tipo não válido para a legenda da opção do campo personalizado.",
		})
		.optional()
		.nullable(),
	icone: z
		.string({
			required_error: "Ícone da opção do campo personalizado não informado.",
			invalid_type_error: "Tipo não válido para o ícone da opção do campo personalizado.",
		})
		.optional()
		.nullable(),
});
export type TCustomFieldOption = z.infer<typeof CustomFieldOptionSchema>;

export const CustomFieldSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização do campo personalizado.",
	}),
	entidade: CustomFieldEntityEnum.default("CLIENTE"),
	/**
	 * Chave kebab-case do catálogo nativo (`lib/custom-fields/native-catalog.ts`) quando o campo
	 * é um dos que a plataforma conhece de fábrica. `null` para campos criados pela organização.
	 */
	chaveNativa: z
		.string({
			required_error: "Chave nativa do campo personalizado não informada.",
			invalid_type_error: "Tipo não válido para a chave nativa do campo personalizado.",
		})
		.optional()
		.nullable(),
	titulo: z.string({
		required_error: "Título do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o título do campo personalizado.",
	}),
	descricao: z
		.string({
			required_error: "Descrição do campo personalizado não informada.",
			invalid_type_error: "Tipo não válido para a descrição do campo personalizado.",
		})
		.optional()
		.nullable(),
	tipo: CustomFieldTypeEnum,
	opcoes: z
		.array(CustomFieldOptionSchema, {
			required_error: "Opções do campo personalizado não informadas.",
			invalid_type_error: "Tipo não válido para as opções do campo personalizado.",
		})
		.optional()
		.nullable(),
	ativo: z
		.boolean({
			required_error: "Ativo do campo personalizado não informado.",
			invalid_type_error: "Tipo não válido para o ativo do campo personalizado.",
		})
		.default(true),
	dataInsercao: z
		.string({
			required_error: "Data de inserção do campo personalizado não informada.",
			invalid_type_error: "Tipo não válido para a data de inserção do campo personalizado.",
		})
		.datetime({ message: "Formato inválido para a data de inserção do campo personalizado." })
		.transform((value) => new Date(value)),
	dataAtualizacao: z
		.string({
			required_error: "Data de atualização do campo personalizado não informada.",
			invalid_type_error: "Tipo não válido para a data de atualização do campo personalizado.",
		})
		.datetime({ message: "Formato inválido para a data de atualização do campo personalizado." })
		.transform((value) => new Date(value))
		.optional()
		.nullable(),
});
export type TCustomField = z.infer<typeof CustomFieldSchema>;

/**
 * O formato do `valor` depende do `tipo` do campo — a validação cruzada (tipo × valor × opções)
 * mora em `saveClientCustomFieldValues`, que é o único ponto de escrita.
 */
export const CustomFieldValueSchema = z.union(
	[
		z.string({ invalid_type_error: "Tipo não válido para o valor do campo personalizado." }),
		z.number({ invalid_type_error: "Tipo não válido para o valor do campo personalizado." }),
		z.array(z.string({ invalid_type_error: "Tipo não válido para o valor do campo personalizado." })),
	],
	{
		required_error: "Valor do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o valor do campo personalizado.",
	},
);
export type TCustomFieldValue = z.infer<typeof CustomFieldValueSchema>;

export const ClientCustomFieldValueSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização do valor do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização do valor do campo personalizado.",
	}),
	clienteId: z.string({
		required_error: "ID do cliente do valor do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o ID do cliente do valor do campo personalizado.",
	}),
	campoId: z.string({
		required_error: "ID do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o ID do campo personalizado.",
	}),
	valor: CustomFieldValueSchema,
	dataInsercao: z
		.string({
			required_error: "Data de inserção do valor do campo personalizado não informada.",
			invalid_type_error: "Tipo não válido para a data de inserção do valor do campo personalizado.",
		})
		.datetime({ message: "Formato inválido para a data de inserção do valor do campo personalizado." })
		.transform((value) => new Date(value)),
	dataAtualizacao: z
		.string({
			required_error: "Data de atualização do valor do campo personalizado não informada.",
			invalid_type_error: "Tipo não válido para a data de atualização do valor do campo personalizado.",
		})
		.datetime({ message: "Formato inválido para a data de atualização do valor do campo personalizado." })
		.transform((value) => new Date(value))
		.optional()
		.nullable(),
});
export type TClientCustomFieldValue = z.infer<typeof ClientCustomFieldValueSchema>;

/** Payload de escrita usado pelo assistente de cadastro e por qualquer superfície futura. */
export const CustomFieldValueInputSchema = z.object({
	campoId: z.string({
		required_error: "ID do campo personalizado não informado.",
		invalid_type_error: "Tipo não válido para o ID do campo personalizado.",
	}),
	valor: CustomFieldValueSchema,
});
export type TCustomFieldValueInput = z.infer<typeof CustomFieldValueInputSchema>;
