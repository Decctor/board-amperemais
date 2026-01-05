import z from "zod";

const UtilsRFmSchema = z.object({
	identificador: z.enum(["CONFIG_RFM"]),
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
	valor: z.object({
		identificador: z.enum(["ONLINE_IMPORTATION"]),
		dados: z.record(z.string(), z.any()),
	}),
});

const UtilsSalesPromoCampaignSchema = z.object({
	identificador: z.enum(["SALES_PROMO_CAMPAIGN"]),
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
					valorPromocional: z.number({
						required_error: "Valor promocional não informado.",
						invalid_type_error: "Tipo não válido para o valor promocional.",
					}),
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

export const UtilsSchema = z.discriminatedUnion("identificador", [UtilsRFmSchema, UtilsOnlineImportationSchema, UtilsSalesPromoCampaignSchema]);
export const UtilsIdentifierSchema = z.enum(["CONFIG_RFM", "ONLINE_IMPORTATION", "SALES_PROMO_CAMPAIGN"]);
export type TUtilsIdentifier = z.infer<typeof UtilsIdentifierSchema>;
export type TUtilsRFMConfig = z.infer<typeof UtilsRFmSchema>;
export type TUtilsValue = z.infer<typeof UtilsSchema>["valor"];
export type TUtilsSalesPromoCampaignConfig = z.infer<typeof UtilsSalesPromoCampaignSchema>;
