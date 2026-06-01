import { z } from "zod";
import { ShopCompositionBlockTypeEnum, ShopHeaderCoverTypeEnum, ShopModeEnum, ShopProductsModeEnum, ShopWeekdayEnum } from "./enums";

const SHOP_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const SHOP_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ShopTimeRangeSchema = z
	.object({
		inicio: z
			.string({ required_error: "Horário inicial não informado.", invalid_type_error: "Tipo não válido para horário inicial." })
			.regex(SHOP_TIME_PATTERN, {
				message: "Horário inicial deve usar o formato HH:mm.",
			}),
		fim: z
			.string({ required_error: "Horário final não informado.", invalid_type_error: "Tipo não válido para horário final." })
			.regex(SHOP_TIME_PATTERN, {
				message: "Horário final deve usar o formato HH:mm.",
			}),
	})
	.refine((range) => range.inicio < range.fim, {
		message: "Horário inicial deve ser anterior ao horário final.",
		path: ["fim"],
	});
export type TShopTimeRange = z.infer<typeof ShopTimeRangeSchema>;

function rangesOverlap(ranges: TShopTimeRange[]) {
	const orderedRanges = [...ranges].sort((a, b) => a.inicio.localeCompare(b.inicio));
	return orderedRanges.some((range, index) => index > 0 && orderedRanges[index - 1].fim > range.inicio);
}

export const ShopScheduleSchema = z
	.object({
		dia: ShopWeekdayEnum,
		periodos: z.array(ShopTimeRangeSchema).default([]),
	})
	.refine((schedule) => !rangesOverlap(schedule.periodos), {
		message: "Os períodos do dia não podem se sobrepor.",
		path: ["periodos"],
	});
export type TShopSchedule = z.infer<typeof ShopScheduleSchema>;

export const ShopScheduleExceptionSchema = z
	.object({
		data: z
			.string({ required_error: "Data da exceção não informada.", invalid_type_error: "Tipo não válido para data da exceção." })
			.regex(SHOP_DATE_PATTERN, {
				message: "Data da exceção deve usar o formato YYYY-MM-DD.",
			}),
		periodos: z.array(ShopTimeRangeSchema).default([]),
		mensagem: z.string({ invalid_type_error: "Tipo não válido para mensagem da exceção." }).optional().nullable().default(null),
	})
	.refine((exception) => !rangesOverlap(exception.periodos), {
		message: "Os períodos da exceção não podem se sobrepor.",
		path: ["periodos"],
	});
export type TShopScheduleException = z.infer<typeof ShopScheduleExceptionSchema>;

export const ShopCompositionBlockSchema = z.object({
	tipo: ShopCompositionBlockTypeEnum,
	ativo: z.boolean({
		required_error: "Status do bloco não informado.",
		invalid_type_error: "Tipo não válido para status do bloco.",
	}),
	ordem: z.number({
		required_error: "Ordem do bloco não informada.",
		invalid_type_error: "Tipo não válido para ordem do bloco.",
	}),
});
export type TShopCompositionBlock = z.infer<typeof ShopCompositionBlockSchema>;

export const ShopProductsConfigurationSchema = z.object({
	modo: ShopProductsModeEnum.default("ATIVOS"),
	produtoIds: z
		.array(
			z.string({
				invalid_type_error: "Tipo não válido para ID do produto.",
			}),
		)
		.default([]),
	destaqueIds: z.array(z.string({ invalid_type_error: "Tipo não válido para ID do produto em destaque." })).default([]),
});
export type TShopProductsConfiguration = z.infer<typeof ShopProductsConfigurationSchema>;

export const ShopServiceConfigurationSchema = z
	.object({
		retirada: z
			.object({
				ativo: z
					.boolean({ required_error: "Configuração de retirada não informada.", invalid_type_error: "Tipo não válido para configuração de retirada." })
					.default(true),
			})
			.default({ ativo: true }),
		entrega: z
			.object({
				ativo: z
					.boolean({ required_error: "Configuração de entrega não informada.", invalid_type_error: "Tipo não válido para configuração de entrega." })
					.default(false),
				pedidoMinimo: z
					.number({ invalid_type_error: "Tipo não válido para pedido mínimo." })
					.nonnegative("Pedido mínimo não pode ser negativo.")
					.default(0),
				prazoMinutos: z
					.number({ invalid_type_error: "Tipo não válido para prazo estimado." })
					.int("Prazo estimado deve ser inteiro.")
					.nonnegative("Prazo estimado não pode ser negativo.")
					.default(60),
			})
			.default({ ativo: false, pedidoMinimo: 0, prazoMinutos: 60 }),
	})
	.refine((data) => data.retirada.ativo || data.entrega.ativo, {
		message: "Selecione retirada ou entrega para a loja digital.",
		path: ["retirada", "ativo"],
	});
export type TShopServiceConfiguration = z.infer<typeof ShopServiceConfigurationSchema>;

export const ShopOperationConfigurationSchema = z
	.object({
		preparoMinutos: z
			.number({ invalid_type_error: "Tipo não válido para tempo de preparo." })
			.int("Tempo de preparo deve ser inteiro.")
			.nonnegative("Tempo de preparo não pode ser negativo.")
			.default(30),
		mensagemCheckout: z.string({ invalid_type_error: "Tipo não válido para mensagem do checkout." }).optional().nullable().default(null),
		horarios: z.array(ShopScheduleSchema).default([]),
		excecoesHorarios: z.array(ShopScheduleExceptionSchema).default([]),
	})
	.superRefine((data, ctx) => {
		const weekdays = new Set<string>();
		data.horarios.forEach((schedule, index) => {
			if (weekdays.has(schedule.dia)) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Não pode haver dois horários para o mesmo dia.", path: ["horarios", index, "dia"] });
			}
			weekdays.add(schedule.dia);
		});

		const dates = new Set<string>();
		data.excecoesHorarios.forEach((exception, index) => {
			if (dates.has(exception.data)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Não pode haver duas exceções para a mesma data.",
					path: ["excecoesHorarios", index, "data"],
				});
			}
			dates.add(exception.data);
		});
	});
export type TShopOperationConfiguration = z.infer<typeof ShopOperationConfigurationSchema>;

export const ShopAppearanceConfigurationSchema = z.object({
	headerCoverUrl: z.string({ invalid_type_error: "Tipo não válido para URL da capa." }).optional().nullable().default(null),
	headerCoverTipo: ShopHeaderCoverTypeEnum.optional().nullable().default(null),
	blocos: z.array(ShopCompositionBlockSchema).default([
		{ tipo: "EM_DESTAQUE", ativo: true, ordem: 1 },
		{ tipo: "MAIS_PEDIDOS", ativo: true, ordem: 2 },
		{ tipo: "GRUPOS_PRODUTOS", ativo: true, ordem: 3 },
	]),
});
export type TShopAppearanceConfiguration = z.infer<typeof ShopAppearanceConfigurationSchema>;

export const ShopSettingsConfigurationSchema = z
	.object({
		atendimento: ShopServiceConfigurationSchema.default({
			retirada: { ativo: true },
			entrega: { ativo: false, pedidoMinimo: 0, prazoMinutos: 60 },
		}),
		operacao: ShopOperationConfigurationSchema.default({
			preparoMinutos: 30,
			mensagemCheckout: null,
			horarios: [],
			excecoesHorarios: [],
		}),
		aparencia: ShopAppearanceConfigurationSchema.default({
			headerCoverUrl: null,
			headerCoverTipo: null,
			blocos: [
				{ tipo: "EM_DESTAQUE", ativo: true, ordem: 1 },
				{ tipo: "MAIS_PEDIDOS", ativo: true, ordem: 2 },
				{ tipo: "GRUPOS_PRODUTOS", ativo: true, ordem: 3 },
			],
		}),
		produtos: ShopProductsConfigurationSchema.default({
			modo: "ATIVOS",
			produtoIds: [],
			destaqueIds: [],
		}),
	})
	.strict()
	.refine((data) => data.produtos.modo !== "INCLUIR" || data.produtos.produtoIds.length > 0, {
		message: "Selecione pelo menos um produto para o modo incluir.",
		path: ["produtos", "produtoIds"],
	})
	.refine((data) => !data.aparencia.headerCoverUrl || !!data.aparencia.headerCoverTipo, {
		message: "Selecione o tipo da capa.",
		path: ["aparencia", "headerCoverTipo"],
	})
	.refine((data) => new Set(data.aparencia.blocos.map((block) => block.ordem)).size === data.aparencia.blocos.length, {
		message: "Os blocos de composição devem ter ordens únicas.",
		path: ["aparencia", "blocos"],
	});
export type TShopSettingsConfiguration = z.infer<typeof ShopSettingsConfigurationSchema>;

export const DEFAULT_SHOP_SETTINGS_CONFIGURATION: TShopSettingsConfiguration = {
	atendimento: {
		retirada: { ativo: true },
		entrega: { ativo: false, pedidoMinimo: 0, prazoMinutos: 60 },
	},
	operacao: {
		preparoMinutos: 30,
		mensagemCheckout: null,
		horarios: [],
		excecoesHorarios: [],
	},
	aparencia: {
		headerCoverUrl: null,
		headerCoverTipo: null,
		blocos: [
			{ tipo: "EM_DESTAQUE", ativo: true, ordem: 1 },
			{ tipo: "MAIS_PEDIDOS", ativo: true, ordem: 2 },
			{ tipo: "GRUPOS_PRODUTOS", ativo: true, ordem: 3 },
		],
	},
	produtos: {
		modo: "ATIVOS",
		produtoIds: [],
		destaqueIds: [],
	},
};

export const ShopSettingsSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	ativo: z
		.boolean({
			required_error: "Status da loja digital não informado.",
			invalid_type_error: "Tipo não válido para status da loja digital.",
		})
		.default(false),
	modo: ShopModeEnum.default("CARDAPIO"),
	configuracoes: ShopSettingsConfigurationSchema.default(DEFAULT_SHOP_SETTINGS_CONFIGURATION),
	dataInsercao: z
		.string({
			required_error: "Data de inserção não informada.",
			invalid_type_error: "Tipo não válido para data de inserção.",
		})
		.datetime({ message: "Tipo não válido para data de inserção." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
	dataAtualizacao: z
		.string({
			invalid_type_error: "Tipo não válido para data de atualização.",
		})
		.datetime({ message: "Tipo não válido para data de atualização." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
});
export type TShopSettings = z.infer<typeof ShopSettingsSchema>;

export const ShopCartItemModifierSchema = z.object({
	opcaoId: z.string({
		required_error: "ID da opção não informado.",
		invalid_type_error: "Tipo não válido para ID da opção.",
	}),
	quantidade: z
		.number({
			required_error: "Quantidade do modificador não informada.",
			invalid_type_error: "Tipo não válido para quantidade do modificador.",
		})
		.positive("Quantidade do modificador deve ser positiva."),
});
export type TShopCartItemModifier = z.infer<typeof ShopCartItemModifierSchema>;

export const ShopCartItemSchema = z.object({
	tempId: z.string({ invalid_type_error: "Tipo não válido para ID temporário." }).optional().nullable(),
	produtoId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	produtoVarianteId: z.string({ invalid_type_error: "Tipo não válido para ID da variante." }).optional().nullable(),
	quantidade: z
		.number({
			required_error: "Quantidade do item não informada.",
			invalid_type_error: "Tipo não válido para quantidade do item.",
		})
		.min(1, "Quantidade do item deve ser maior que zero."),
	modificadores: z.array(ShopCartItemModifierSchema).default([]),
});
export type TShopCartItem = z.infer<typeof ShopCartItemSchema>;

export const ShopCustomerSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo não válido para ID do cliente." }).optional().nullable(),
	nome: z.string({ invalid_type_error: "Tipo não válido para nome do cliente." }).optional().nullable(),
	cpfCnpj: z.string({ invalid_type_error: "Tipo não válido para CPF/CNPJ." }).optional().nullable(),
	telefone: z.string({
		required_error: "Telefone não informado.",
		invalid_type_error: "Tipo não válido para telefone.",
	}),
});
export type TShopCustomer = z.infer<typeof ShopCustomerSchema>;

export const ShopDeliveryAddressSchema = z.object({
	titulo: z.string({ invalid_type_error: "Tipo não válido para título da localização." }).optional().nullable(),
	localizacaoCep: z.string({ invalid_type_error: "Tipo não válido para CEP." }).optional().nullable(),
	localizacaoEstado: z.string({ invalid_type_error: "Tipo não válido para estado." }).optional().nullable(),
	localizacaoCidade: z.string({ invalid_type_error: "Tipo não válido para cidade." }).optional().nullable(),
	localizacaoBairro: z.string({ invalid_type_error: "Tipo não válido para bairro." }).optional().nullable(),
	localizacaoLogradouro: z.string({ invalid_type_error: "Tipo não válido para logradouro." }).optional().nullable(),
	localizacaoNumero: z.string({ invalid_type_error: "Tipo não válido para número." }).optional().nullable(),
	localizacaoComplemento: z.string({ invalid_type_error: "Tipo não válido para complemento." }).optional().nullable(),
});
export type TShopDeliveryAddress = z.infer<typeof ShopDeliveryAddressSchema>;

export const ShopDeliverySchema = z
	.object({
		modalidade: z.enum(["RETIRADA", "ENTREGA"], {
			required_error: "Modalidade de entrega não informada.",
			invalid_type_error: "Tipo não válido para modalidade de entrega.",
		}),
		endereco: ShopDeliveryAddressSchema.optional().nullable(),
	})
	.refine((data) => data.modalidade !== "ENTREGA" || !!data.endereco?.localizacaoLogradouro, {
		message: "Logradouro da entrega não informado.",
		path: ["endereco", "localizacaoLogradouro"],
	})
	.refine((data) => data.modalidade !== "ENTREGA" || !!data.endereco?.localizacaoNumero, {
		message: "Número da entrega não informado.",
		path: ["endereco", "localizacaoNumero"],
	})
	.refine((data) => data.modalidade !== "ENTREGA" || !!data.endereco?.localizacaoCidade, {
		message: "Cidade da entrega não informada.",
		path: ["endereco", "localizacaoCidade"],
	});
export type TShopDelivery = z.infer<typeof ShopDeliverySchema>;

export const CreateShopOrderInputSchema = z.object({
	cliente: ShopCustomerSchema,
	entrega: ShopDeliverySchema,
	itens: z.array(ShopCartItemSchema).min(1, { message: "Pelo menos um item é obrigatório." }),
	cashbackResgateSolicitado: z
		.number({ invalid_type_error: "Tipo não válido para resgate de cashback." })
		.nonnegative("Valor de cashback não pode ser negativo.")
		.default(0),
	observacoes: z.string({ invalid_type_error: "Tipo não válido para observações." }).optional().nullable(),
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
