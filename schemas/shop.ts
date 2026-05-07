import { z } from "zod";
import { ShopCompositionBlockTypeEnum, ShopHeaderCoverTypeEnum, ShopModeEnum, ShopProductsModeEnum } from "./enums";

export const ShopCompositionBlockSchema = z.object({
	tipo: ShopCompositionBlockTypeEnum,
	ativo: z.boolean({
		required_error: "Status do bloco nao informado.",
		invalid_type_error: "Tipo nao valido para status do bloco.",
	}),
	ordem: z.number({
		required_error: "Ordem do bloco nao informada.",
		invalid_type_error: "Tipo nao valido para ordem do bloco.",
	}),
});
export type TShopCompositionBlock = z.infer<typeof ShopCompositionBlockSchema>;

export const ShopProductsConfigurationSchema = z.object({
	modo: ShopProductsModeEnum.default("ATIVOS"),
	produtoIds: z
		.array(
			z.string({
				invalid_type_error: "Tipo nao valido para ID do produto.",
			}),
		)
		.default([]),
});
export type TShopProductsConfiguration = z.infer<typeof ShopProductsConfigurationSchema>;

export const ShopSettingsConfigurationSchema = z
	.object({
		headerCoverUrl: z.string({ invalid_type_error: "Tipo nao valido para URL da capa." }).optional().nullable().default(null),
		headerCoverTipo: ShopHeaderCoverTypeEnum.optional().nullable().default(null),
		aceitaRetirada: z
			.boolean({
				required_error: "Configuracao de retirada nao informada.",
				invalid_type_error: "Tipo nao valido para configuracao de retirada.",
			})
			.default(true),
		aceitaEntrega: z
			.boolean({
				required_error: "Configuracao de entrega nao informada.",
				invalid_type_error: "Tipo nao valido para configuracao de entrega.",
			})
			.default(false),
		produtos: ShopProductsConfigurationSchema.default({
			modo: "ATIVOS",
			produtoIds: [],
		}),
		produtosEmDestaqueIds: z
			.array(z.string({ invalid_type_error: "Tipo nao valido para ID do produto em destaque." }))
			.default([]),
		blocosComposicao: z
			.array(ShopCompositionBlockSchema)
			.default([
				{ tipo: "EM_DESTAQUE", ativo: true, ordem: 1 },
				{ tipo: "MAIS_PEDIDOS", ativo: true, ordem: 2 },
				{ tipo: "GRUPOS_PRODUTOS", ativo: true, ordem: 3 },
			]),
	})
	.refine((data) => data.aceitaRetirada || data.aceitaEntrega, {
		message: "Selecione retirada ou entrega para a loja digital.",
		path: ["aceitaRetirada"],
	})
	.refine((data) => data.produtos.modo !== "INCLUIR" || data.produtos.produtoIds.length > 0, {
		message: "Selecione pelo menos um produto para o modo incluir.",
		path: ["produtos", "produtoIds"],
	});
export type TShopSettingsConfiguration = z.infer<typeof ShopSettingsConfigurationSchema>;

export const DEFAULT_SHOP_SETTINGS_CONFIGURATION: TShopSettingsConfiguration = {
	headerCoverUrl: null,
	headerCoverTipo: null,
	aceitaRetirada: true,
	aceitaEntrega: false,
	produtos: {
		modo: "ATIVOS",
		produtoIds: [],
	},
	produtosEmDestaqueIds: [],
	blocosComposicao: [
		{ tipo: "EM_DESTAQUE", ativo: true, ordem: 1 },
		{ tipo: "MAIS_PEDIDOS", ativo: true, ordem: 2 },
		{ tipo: "GRUPOS_PRODUTOS", ativo: true, ordem: 3 },
	],
};

export const ShopSettingsSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para ID da organizacao.",
	}),
	ativo: z
		.boolean({
			required_error: "Status da loja digital nao informado.",
			invalid_type_error: "Tipo nao valido para status da loja digital.",
		})
		.default(false),
	modo: ShopModeEnum.default("CARDAPIO"),
	configuracoes: ShopSettingsConfigurationSchema.default(DEFAULT_SHOP_SETTINGS_CONFIGURATION),
	dataInsercao: z
		.string({
			required_error: "Data de insercao nao informada.",
			invalid_type_error: "Tipo nao valido para data de insercao.",
		})
		.datetime({ message: "Tipo nao valido para data de insercao." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
	dataAtualizacao: z
		.string({
			invalid_type_error: "Tipo nao valido para data de atualizacao.",
		})
		.datetime({ message: "Tipo nao valido para data de atualizacao." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
});
export type TShopSettings = z.infer<typeof ShopSettingsSchema>;

export const ShopCartItemModifierSchema = z.object({
	opcaoId: z.string({
		required_error: "ID da opcao nao informado.",
		invalid_type_error: "Tipo nao valido para ID da opcao.",
	}),
	quantidade: z
		.number({
			required_error: "Quantidade do modificador nao informada.",
			invalid_type_error: "Tipo nao valido para quantidade do modificador.",
		})
		.positive("Quantidade do modificador deve ser positiva."),
});
export type TShopCartItemModifier = z.infer<typeof ShopCartItemModifierSchema>;

export const ShopCartItemSchema = z.object({
	tempId: z.string({ invalid_type_error: "Tipo nao valido para ID temporario." }).optional().nullable(),
	produtoId: z.string({
		required_error: "ID do produto nao informado.",
		invalid_type_error: "Tipo nao valido para ID do produto.",
	}),
	produtoVarianteId: z.string({ invalid_type_error: "Tipo nao valido para ID da variante." }).optional().nullable(),
	quantidade: z
		.number({
			required_error: "Quantidade do item nao informada.",
			invalid_type_error: "Tipo nao valido para quantidade do item.",
		})
		.min(1, "Quantidade do item deve ser maior que zero."),
	modificadores: z.array(ShopCartItemModifierSchema).default([]),
});
export type TShopCartItem = z.infer<typeof ShopCartItemSchema>;

export const ShopCustomerSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo nao valido para ID do cliente." }).optional().nullable(),
	nome: z.string({ invalid_type_error: "Tipo nao valido para nome do cliente." }).optional().nullable(),
	cpfCnpj: z.string({ invalid_type_error: "Tipo nao valido para CPF/CNPJ." }).optional().nullable(),
	telefone: z.string({
		required_error: "Telefone nao informado.",
		invalid_type_error: "Tipo nao valido para telefone.",
	}),
});
export type TShopCustomer = z.infer<typeof ShopCustomerSchema>;

export const ShopDeliveryAddressSchema = z.object({
	titulo: z.string({ invalid_type_error: "Tipo nao valido para titulo da localizacao." }).optional().nullable(),
	localizacaoCep: z.string({ invalid_type_error: "Tipo nao valido para CEP." }).optional().nullable(),
	localizacaoEstado: z.string({ invalid_type_error: "Tipo nao valido para estado." }).optional().nullable(),
	localizacaoCidade: z.string({ invalid_type_error: "Tipo nao valido para cidade." }).optional().nullable(),
	localizacaoBairro: z.string({ invalid_type_error: "Tipo nao valido para bairro." }).optional().nullable(),
	localizacaoLogradouro: z.string({ invalid_type_error: "Tipo nao valido para logradouro." }).optional().nullable(),
	localizacaoNumero: z.string({ invalid_type_error: "Tipo nao valido para numero." }).optional().nullable(),
	localizacaoComplemento: z.string({ invalid_type_error: "Tipo nao valido para complemento." }).optional().nullable(),
});
export type TShopDeliveryAddress = z.infer<typeof ShopDeliveryAddressSchema>;

export const ShopDeliverySchema = z
	.object({
		modalidade: z.enum(["RETIRADA", "ENTREGA"], {
			required_error: "Modalidade de entrega nao informada.",
			invalid_type_error: "Tipo nao valido para modalidade de entrega.",
		}),
		endereco: ShopDeliveryAddressSchema.optional().nullable(),
	})
	.refine((data) => data.modalidade !== "ENTREGA" || !!data.endereco?.localizacaoLogradouro, {
		message: "Logradouro da entrega nao informado.",
		path: ["endereco", "localizacaoLogradouro"],
	})
	.refine((data) => data.modalidade !== "ENTREGA" || !!data.endereco?.localizacaoNumero, {
		message: "Numero da entrega nao informado.",
		path: ["endereco", "localizacaoNumero"],
	})
	.refine((data) => data.modalidade !== "ENTREGA" || !!data.endereco?.localizacaoCidade, {
		message: "Cidade da entrega nao informada.",
		path: ["endereco", "localizacaoCidade"],
	});
export type TShopDelivery = z.infer<typeof ShopDeliverySchema>;

export const CreateShopOrderInputSchema = z.object({
	cliente: ShopCustomerSchema,
	entrega: ShopDeliverySchema,
	itens: z.array(ShopCartItemSchema).min(1, { message: "Pelo menos um item e obrigatorio." }),
	cashbackResgateSolicitado: z
		.number({ invalid_type_error: "Tipo nao valido para resgate de cashback." })
		.nonnegative("Valor de cashback nao pode ser negativo.")
		.default(0),
	observacoes: z.string({ invalid_type_error: "Tipo nao valido para observacoes." }).optional().nullable(),
});
export type TCreateShopOrderInput = z.infer<typeof CreateShopOrderInputSchema>;

export type TShopDraftMetadata = {
	origem: "SHOP";
	modo: "CARDAPIO" | "CATALOGO";
	subtotalItens: number;
	cashbackResgateSolicitado: number;
	cashbackProgramaId: string | null;
	pagamento: {
		tipo: "NO_LOCAL";
		descricao: string;
	};
	entrega: {
		modalidade: "RETIRADA" | "ENTREGA";
	};
	criadoEm: string;
};
