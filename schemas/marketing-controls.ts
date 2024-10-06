import { z } from 'zod'

export const MonthControlInformation = z.object({
  dias: z.number({
    required_error: 'Dias do mês de referência não informados.',
    invalid_type_error: 'Tipo não válidos para dias do mês de referência.',
  }),
  inicio: z.string({
    required_error: 'Início do mês de referência não informado.',
    invalid_type_error: 'Tipo não válido para o início do mês de referência.',
  }),
  fim: z.string({
    required_error: 'Início do mês de referência não informado.',
    invalid_type_error: 'Tipo não válido para o início do mês de referência.',
  }),
  investimento: z.number({ required_error: 'Valor de investimento não informado.', invalid_type_error: 'Tipo não válido para o valor de investimento.' }),
})

export const MarketingControlSchema = z.object({
  titulo: z.string({ required_error: 'Título não informado.', invalid_type_error: 'Tipo não válido para tipo.' }),
  canaisAquisicao: z.array(z.string({ invalid_type_error: 'Tipo não válido para canal de aquisição.' }), {
    required_error: 'Lista de canais de aquisição não informada.',
    invalid_type_error: 'Tipo não válido para lista de canais de aquisição.',
  }),
  ano: z.number({ required_error: 'Ano de referência não informado.', invalid_type_error: 'Tipo não válido para o ano de referência.' }),
  inicio: z.string({
    required_error: 'Início do mês de referência não informado.',
    invalid_type_error: 'Tipo não válido para o início do mês de referência.',
  }),
  fim: z.string({
    required_error: 'Início do mês de referência não informado.',
    invalid_type_error: 'Tipo não válido para o início do mês de referência.',
  }),
  meses: z.object({
    '1': MonthControlInformation,
    '2': MonthControlInformation,
    '3': MonthControlInformation,
    '4': MonthControlInformation,
    '5': MonthControlInformation,
    '6': MonthControlInformation,
    '7': MonthControlInformation,
    '8': MonthControlInformation,
    '9': MonthControlInformation,
    '10': MonthControlInformation,
    '11': MonthControlInformation,
    '12': MonthControlInformation,
  }),
  dataInsercao: z.string({ required_error: 'Data de inserção não informada.', invalid_type_error: 'Tipo não válido para data de inserção.' }),
})

export type TMarketingControl = z.infer<typeof MarketingControlSchema>
export type TMarketingControlDTO = TMarketingControl & { _id: string }
