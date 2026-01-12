import { z } from "zod";

export const ProductSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	descricao: z.string({
		required_error: "Nome do produto não informado.",
		invalid_type_error: "Tipo não válido para nome do produto.",
	}),
	imagemCapaUrl: z
		.string({
			required_error: "URL da imagem capa do produto não informada.",
			invalid_type_error: "Tipo não válido para URL da imagem capa do produto.",
		})
		.optional()
		.nullable(),
	codigo: z.string({
		required_error: "Codigo do produto não informado.",
		invalid_type_error: "Tipo não válido para codigo do produto.",
	}),
	unidade: z.string({
		required_error: "Unidade do produto não informado.",
		invalid_type_error: "Tipo não válido para unidade do produto.",
	}),
	ncm: z.string({
		required_error: "NCM do produto não informado.",
		invalid_type_error: "Tipo não válido para NCM do produto.",
	}),
	tipo: z.string({
		required_error: "Tipo do produto não informado.",
		invalid_type_error: "Tipo não válido para tipo do produto.",
	}),
	grupo: z.string({
		required_error: "Grupo do produto não informado.",
		invalid_type_error: "Tipo não válido para grupo do produto.",
	}),
	quantidade: z
		.number({
			invalid_type_error: "Tipo não válido para quantidade do produto.",
		})
		.optional()
		.nullable(),
	precoVenda: z
		.number({
			invalid_type_error: "Tipo não válido para preço de venda do produto.",
		})
		.optional()
		.nullable(),
	precoCusto: z
		.number({
			invalid_type_error: "Tipo não válido para preço de custo do produto.",
		})
		.optional()
		.nullable(),
});
export type TProduct = z.infer<typeof ProductSchema>;

export const ProductVariantSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	produtoId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	nome: z.string({
		required_error: "Nome da variante não informado.",
		invalid_type_error: "Tipo não válido para nome da variante.",
	}),
	codigo: z.string({
		required_error: "Código da variante não informado.",
		invalid_type_error: "Tipo não válido para código da variante.",
	}),
	imagemCapaUrl: z
		.string({
			required_error: "URL da imagem capa da variante não informada.",
			invalid_type_error: "Tipo não válido para URL da imagem capa da variante.",
		})
		.optional()
		.nullable(),
	precoVenda: z.number({
		required_error: "Preço de venda da variante não informado.",
		invalid_type_error: "Tipo não válido para preço de venda da variante.",
	}),
	precoCusto: z.number({
		required_error: "Preço de custo da variante não informado.",
		invalid_type_error: "Tipo não válido para preço de custo da variante.",
	}),
	quantidade: z.number({
		required_error: "Quantidade da variante não informada.",
		invalid_type_error: "Tipo não válido para quantidade da variante.",
	}),
	ativo: z.boolean({
		required_error: "Status da variante não informado.",
		invalid_type_error: "Tipo não válido para status da variante.",
	}),
});

export const ProductAddOnSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	nome: z.string({
		required_error: "Nome do adicional não informado.",
		invalid_type_error: "Tipo não válido para nome do adicional.",
	}),
	internoNome: z.string({
		required_error: "Nome interno do adicional não informado.",
		invalid_type_error: "Tipo não válido para nome interno do adicional.",
	}),
	minOpcoes: z.number({
		required_error: "Quantidade mínima de opções não informada.",
		invalid_type_error: "Tipo não válido para quantidade mínima de opções.",
	}),
	maxOpcoes: z.number({
		required_error: "Quantidade máxima de opções não informada.",
		invalid_type_error: "Tipo não válido para quantidade máxima de opções.",
	}),
	ativo: z
		.boolean({
			required_error: "Status do adicional não informado.",
			invalid_type_error: "Tipo não válido para status do adicional.",
		})
		.default(true),
});

export const ProductAddOnOptionSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	produtoAddOnId: z.string({
		required_error: "ID do adicional não informado.",
		invalid_type_error: "Tipo não válido para ID do adicional.",
	}),
	nome: z.string({
		required_error: "Nome da opção não informado.",
		invalid_type_error: "Tipo não válido para nome da opção.",
	}),
	produtoId: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo não válido para ID do produto.",
		})
		.optional()
		.nullable(),
	produtoVarianteId: z
		.string({
			required_error: "ID da variante não informada.",
			invalid_type_error: "Tipo não válido para ID da variante.",
		})
		.optional()
		.nullable(),
	quantidadeConsumo: z
		.number({
			required_error: "Quantidade de consumo não informada.",
			invalid_type_error: "Tipo não válido para quantidade de consumo.",
		})
		.default(1.0),
	codigo: z.string({
		required_error: "Código da opção não informado.",
		invalid_type_error: "Tipo não válido para código da opção.",
	}),
	precoDelta: z
		.number({
			required_error: "Preço delta não informado.",
			invalid_type_error: "Tipo não válido para preço delta.",
		})
		.default(0.0),
	maxQtdePorItem: z
		.number({
			required_error: "Quantidade máxima por item não informada.",
			invalid_type_error: "Tipo não válido para quantidade máxima por item.",
		})
		.default(1),
	ativo: z
		.boolean({
			required_error: "Status da opção não informado.",
			invalid_type_error: "Tipo não válido para status da opção.",
		})
		.default(true),
});

export const ProductAddOnReferenceSchema = z.object({
	produtoId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	produtoVarianteId: z
		.string({
			required_error: "ID da variante não informada.",
			invalid_type_error: "Tipo não válido para ID da variante.",
		})
		.optional()
		.nullable(),
	produtoAddOnId: z.string({
		required_error: "ID do adicional não informado.",
		invalid_type_error: "Tipo não válido para ID do adicional.",
	}),
	ordem: z.number({
		required_error: "Ordem não informada.",
		invalid_type_error: "Tipo não válido para ordem.",
	}),
});
// Product Stats Query Params for Frontend
export type TProductStatsQueryParams = {
	periodAfter: string | null;
	periodBefore: string | null;
	sellerId: string | null;
	partnerId: string | null;
	saleNatures: string[];
};
