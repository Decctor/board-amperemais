import { z } from 'zod'

export const PeriodQueryParamSchema = z.object({
  after: z
    .string({
      required_error: 'Parâmetros de período não fornecidos ou inválidos.',
      invalid_type_error: 'Parâmetros de período não fornecidos ou inválidos.',
    })
    .datetime({ message: 'Tipo inválido para parâmetro de período.' }),
  before: z
    .string({
      required_error: 'Parâmetros de período não fornecidos ou inválidos.',
      invalid_type_error: 'Parâmetros de período não fornecidos ou inválidos.',
    })
    .datetime({ message: 'Tipo inválido para parâmetro de período.' }),
})

export const SalesStatsGeneralQueryParamsSchema = z.object({
  period: PeriodQueryParamSchema,
  total: z.object({
    min: z.number({ invalid_type_error: 'Tipo não válido para valor mínimo da venda.' }).optional().nullable(),
    max: z.number({ invalid_type_error: 'Tipo não válido para valor máximo da venda.' }).optional().nullable(),
  }),
  saleNatures: z.array(
    z.enum(['SN08', 'SN03', 'SN11', 'SN20', 'SN04', 'SN09', 'SN02', 'COND', 'SN99', 'SN01', 'SN05'], {
      required_error: 'Natureza de venda não informado.',
      invalid_type_error: 'Tipo não válido para natureza de venda.',
    })
  ),
  sellers: z.array(z.string({ required_error: 'Nome do vendedor não informado.', invalid_type_error: 'Tipo não válido para o nome do vendedor.' })),
  clientRFMTitles: z.array(
    z.string({ required_error: 'Título RFM do cliente não informado.', invalid_type_error: 'Tipo não válido para o título RFM do cliente.' })
  ),
  productGroups: z.array(z.string({ required_error: 'Grupo de produto não informado.', invalid_type_error: 'Tipo não válido para o grupo de produto.' })),
  excludedSalesIds: z.array(z.string({ required_error: 'ID da venda não informado.', invalid_type_error: 'Tipo não válido para o ID da venda.' })),
})
export type TSaleStatsGeneralQueryParams = z.infer<typeof SalesStatsGeneralQueryParamsSchema>

export const SalesGraphFilterSchema = SalesStatsGeneralQueryParamsSchema.extend({
  group: z.enum(['DIA', 'MÊS', 'BIMESTRE', 'TRIMESTRE', 'SEMESTRE', 'ANO'], {
    required_error: 'Agrupamento de período não informado.',
    invalid_type_error: 'Tipo não válido para o agrupamento de período.',
  }),
})
export type TSalesGraphFilters = z.infer<typeof SalesGraphFilterSchema>

export const SalesRFMFiltersSchema = z.object({
  period: z.object({
    after: z
      .string({
        required_error: 'Parâmetros de período não fornecidos ou inválidos.',
        invalid_type_error: 'Parâmetros de período não fornecidos ou inválidos.',
      })
      .datetime({ message: 'Tipo inválido para parâmetro de período.' }),
    before: z
      .string({
        required_error: 'Parâmetros de período não fornecidos ou inválidos.',
        invalid_type_error: 'Parâmetros de período não fornecidos ou inválidos.',
      })
      .datetime({ message: 'Tipo inválido para parâmetro de período.' }),
  }),
  total: z.object({
    min: z.number({ invalid_type_error: 'Tipo não válido para valor mínimo da venda.' }).optional().nullable(),
    max: z.number({ invalid_type_error: 'Tipo não válido para valor máximo da venda.' }).optional().nullable(),
  }),
  saleNatures: z.array(
    z.enum(['SN08', 'SN03', 'SN11', 'SN20', 'SN04', 'SN09', 'SN02', 'COND', 'SN99', 'SN01', 'SN05'], {
      required_error: 'Natureza de venda não informado.',
      invalid_type_error: 'Tipo não válido para natureza de venda.',
    })
  ),
  sellers: z.array(z.string({ required_error: 'Nome do vendedor não informado.', invalid_type_error: 'Tipo não válido para o nome do vendedor.' })),
})

export type TSalesRFMFilters = z.infer<typeof SalesRFMFiltersSchema>

export const SalesGeneralStatsFiltersSchema = z.object({
  period: z.object({
    after: z
      .string({
        required_error: 'Parâmetros de período não fornecidos ou inválidos.',
        invalid_type_error: 'Parâmetros de período não fornecidos ou inválidos.',
      })
      .datetime({ message: 'Tipo inválido para parâmetro de período.' }),
    before: z
      .string({
        required_error: 'Parâmetros de período não fornecidos ou inválidos.',
        invalid_type_error: 'Parâmetros de período não fornecidos ou inválidos.',
      })
      .datetime({ message: 'Tipo inválido para parâmetro de período.' }),
  }),
  total: z.object({
    min: z.number({ invalid_type_error: 'Tipo não válido para valor mínimo da venda.' }).optional().nullable(),
    max: z.number({ invalid_type_error: 'Tipo não válido para valor máximo da venda.' }).optional().nullable(),
  }),
  saleNatures: z.array(
    z.enum(['SN08', 'SN03', 'SN11', 'SN20', 'SN04', 'SN09', 'SN02', 'COND', 'SN99', 'SN01', 'SN05'], {
      required_error: 'Natureza de venda não informado.',
      invalid_type_error: 'Tipo não válido para natureza de venda.',
    })
  ),
  sellers: z.array(z.string({ required_error: 'Nome do vendedor não informado.', invalid_type_error: 'Tipo não válido para o nome do vendedor.' })),
  clientRFMTitles: z.array(
    z.string({ required_error: 'Título RFM do cliente não informado.', invalid_type_error: 'Tipo não válido para o título RFM do cliente.' })
  ),
  productGroups: z.array(z.string({ required_error: 'Grupo de produto não informado.', invalid_type_error: 'Tipo não válido para o grupo de produto.' })),
  excludedSalesIds: z.array(z.string({ required_error: 'ID da venda não informado.', invalid_type_error: 'Tipo não válido para o ID da venda.' })),
})
export type TSalesGeneralStatsFilters = z.infer<typeof SalesGeneralStatsFiltersSchema>

export const SalesMarketingStatsFiltersSchema = z.object({
  period: z.object({
    after: z
      .string({
        required_error: 'Parâmetros de período não fornecidos ou inválidos.',
        invalid_type_error: 'Parâmetros de período não fornecidos ou inválidos.',
      })
      .datetime({ message: 'Tipo inválido para parâmetro de período.' }),
    before: z
      .string({
        required_error: 'Parâmetros de período não fornecidos ou inválidos.',
        invalid_type_error: 'Parâmetros de período não fornecidos ou inválidos.',
      })
      .datetime({ message: 'Tipo inválido para parâmetro de período.' }),
  }),
})
export type TSalesMarketingStatsFilters = z.infer<typeof SalesMarketingStatsFiltersSchema>
