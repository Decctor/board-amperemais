import z from "zod";

export const UtilsRFMSchema = z.object({
	identificador: z.enum(["CONFIG_RFM"]),
	organizacaoId: z.string({
		invalid_type_error: "Tipo não válido para a organização ID.",
	}),
	valor: z.object({
		identificador: z.enum(["CONFIG_RFM"]),
		frequencia: z.object({
			"5": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"4": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"3": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"2": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"1": z.object({
				min: z.number(),
				max: z.number(),
			}),
		}),
		recencia: z.object({
			"5": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"4": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"3": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"2": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"1": z.object({
				min: z.number(),
				max: z.number(),
			}),
		}),
		monetario: z.object({
			"5": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"4": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"3": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"2": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"1": z.object({
				min: z.number(),
				max: z.number(),
			}),
		}),
	}),
});

const UtilsOnlineImportationSchema = z.object({
	identificador: z.enum(["ONLINE_IMPORTATION"]),
	organizacaoId: z.string({
		required_error: "Organização ID não informada.",
		invalid_type_error: "Tipo não válido para a organização ID.",
	}),
	valor: z.object({
		identificador: z.enum(["ONLINE_IMPORTATION"]),
		dados: z.record(z.string(), z.any()),
	}),
});

const UtilsCardapioWebImportationSchema = z.object({
	identificador: z.enum(["CARDAPIO_WEB_IMPORTATION"]),
	organizacaoId: z.string({
		required_error: "Organização ID não informada.",
		invalid_type_error: "Tipo não válido para a organização ID.",
	}),
	valor: z.object({
		identificador: z.enum(["CARDAPIO_WEB_IMPORTATION"]),
		dados: z.record(z.string(), z.any()),
	}),
});

const UtilsNuvemshopImportationSchema = z.object({
	identificador: z.enum(["NUVEMSHOP_IMPORTATION"]),
	organizacaoId: z.string({
		required_error: "Organização ID não informada.",
		invalid_type_error: "Tipo não válido para a organização ID.",
	}),
	valor: z.object({
		identificador: z.enum(["NUVEMSHOP_IMPORTATION"]),
		dados: z.record(z.string(), z.any()),
	}),
});

const UtilsCardapioWebCatalogSyncSchema = z.object({
	identificador: z.enum(["CARDAPIO_WEB_CATALOG_SYNC"]),
	organizacaoId: z.string({
		required_error: "Organização ID não informada.",
		invalid_type_error: "Tipo não válido para a organização ID.",
	}),
	valor: z.object({
		identificador: z.enum(["CARDAPIO_WEB_CATALOG_SYNC"]),
		dados: z.object({
			organizacaoId: z.string({
				required_error: "Organização ID não informada.",
				invalid_type_error: "Tipo não válido para a organização ID.",
			}),
			data: z.string({
				required_error: "Data não informada.",
				invalid_type_error: "Tipo não válido para a data.",
			}),
		}),
	}),
});

const UtilsSalesPromoCampaignSchema = z.object({
	identificador: z.enum(["SALES_PROMO_CAMPAIGN"]),
	organizacaoId: z.string({
		required_error: "Organização ID não informada.",
		invalid_type_error: "Tipo não válido para a organização ID.",
	}),
	valor: z.object({
		identificador: z.enum(["SALES_PROMO_CAMPAIGN"]),
		dados: z.object({
			titulo: z.string({ required_error: "Título não informado.", invalid_type_error: "Tipo não válido para o título." }),
			periodoEstatistico: z.object({
				inicio: z.string({
					required_error: "Início do período estatístico não informado.",
					invalid_type_error: "Tipo não válido para o início do período estatístico.",
				}),
				fim: z.string({
					required_error: "Fim do período estatístico não informado.",
					invalid_type_error: "Tipo não válido para o fim do período estatístico.",
				}),
			}),
			itens: z.array(
				z.object({
					titulo: z.string({ required_error: "Título não informado.", invalid_type_error: "Tipo não válido para o título." }),
					produtos: z.array(
						z.object({
							id: z.string({ required_error: "ID do produto não informado.", invalid_type_error: "Tipo não válido para o ID do produto." }),
							codigo: z.string({ required_error: "Código do produto não informado.", invalid_type_error: "Tipo não válido para o código do produto." }),
							nome: z.string({ required_error: "Nome do produto não informado.", invalid_type_error: "Tipo não válido para o nome do produto." }),
						}),
					),
					imagemCapaUrl: z
						.string({ required_error: "Imagem capa URL não informada.", invalid_type_error: "Tipo não válido para a imagem capa URL." })
						.optional()
						.nullable(),
					valorBase: z.number({ required_error: "Valor base não informado.", invalid_type_error: "Tipo não válido para o valor base." }),
					valorPromocional: z
						.number({
							required_error: "Valor promocional não informado.",
							invalid_type_error: "Tipo não válido para o valor promocional.",
						})
						.optional()
						.nullable(),
					anuncioData: z
						.string({ required_error: "Data de anúncio não informada.", invalid_type_error: "Tipo não válido para a data de anúncio." })
						.optional(),
					anuncioValorPromocional: z
						.number({
							required_error: "Valor promocional de anúncio não informado.",
							invalid_type_error: "Tipo não válido para o valor promocional de anúncio.",
						})
						.optional(),
					etiqueta: z.enum(["PROMO-A4", "PROMO-GRID-1/16"]),
				}),
			),
			rastrearRankingVendedores: z.boolean({
				required_error: "Rastrear ranking de vendedores não informado.",
				invalid_type_error: "Tipo não válido para o rastrear ranking de vendedores.",
			}),
			rastrearRankingProdutos: z.boolean({
				required_error: "Rastrear ranking de produtos não informado.",
				invalid_type_error: "Tipo não válido para o rastrear ranking de produtos.",
			}),
			rastrearRankingParceiros: z.boolean({
				required_error: "Rastrear ranking de parceiros não informado.",
				invalid_type_error: "Tipo não válido para o rastrear ranking de parceiros.",
			}),
		}),
	}),
});

export const UtilsNuvemFiscalApiTokenValorSchema = z.object({
	identificador: z.enum(["NUVEM_FISCAL_API_TOKEN"]),
	accessToken: z.string({
		required_error: "Token de acesso da Nuvem Fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o token de acesso da Nuvem Fiscal.",
	}),
	dataExpiracao: z
		.string({
			required_error: "Data de expiracao do token da Nuvem Fiscal nao informada.",
			invalid_type_error: "Tipo nao valido para a data de expiracao do token da Nuvem Fiscal.",
		})
		.datetime({ message: "Tipo nao valido para a data de expiracao do token da Nuvem Fiscal." }),
});
export type TUtilsNuvemFiscalApiTokenValor = z.infer<typeof UtilsNuvemFiscalApiTokenValorSchema>;

const UtilsNuvemFiscalApiTokenSchema = z.object({
	identificador: z.enum(["NUVEM_FISCAL_API_TOKEN"]),
	organizacaoId: z
		.string({
			invalid_type_error: "Tipo nao valido para a organizacao ID do token da Nuvem Fiscal.",
		})
		.optional()
		.nullable(),
	valor: UtilsNuvemFiscalApiTokenValorSchema,
});

export const UtilsSchema = z.discriminatedUnion("identificador", [
	UtilsRFMSchema,
	UtilsOnlineImportationSchema,
	UtilsCardapioWebImportationSchema,
	UtilsNuvemshopImportationSchema,
	UtilsSalesPromoCampaignSchema,
	UtilsNuvemFiscalApiTokenSchema,
]);
export const UtilsIdentifierSchema = z.enum([
	"CONFIG_RFM",
	"ONLINE_IMPORTATION",
	"CARDAPIO_WEB_IMPORTATION",
	"NUVEMSHOP_IMPORTATION",
	"SALES_PROMO_CAMPAIGN",
	"NUVEM_FISCAL_API_TOKEN",
]);
export type TUtilsIdentifier = z.infer<typeof UtilsIdentifierSchema>;
export type TUtilsRFMConfig = z.infer<typeof UtilsRFMSchema>;
export type TUtilsValue = z.infer<typeof UtilsSchema>["valor"];
export type TUtilsSalesPromoCampaignConfig = z.infer<typeof UtilsSalesPromoCampaignSchema>;
