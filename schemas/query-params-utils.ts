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

export const PeriodQueryParamWithGroupingSchema = z.object({
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
  group: z.enum(['DIA', 'MÊS', 'BIMESTRE', 'TRIMESTRE', 'SEMESTRE', 'ANO'], {
    required_error: 'Agrupamento de período não informado.',
    invalid_type_error: 'Tipo não válido para o agrupamento de período.',
  }),
})
