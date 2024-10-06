import { z } from 'zod'

export const ClientSchema = z.object({
  nome: z.string({ required_error: 'Nome do cliente não informado.', invalid_type_error: 'Tipo não válido para o nome do cliente.' }),
  telefone: z.string({ invalid_type_error: 'Tipo não válido para telefone.' }).optional().nullable(),
  email: z.string({ invalid_type_error: 'Tipo não válido para email.' }).optional().nullable(),
  canalAquisicao: z.string({ invalid_type_error: 'Tipo não válido para canal de aquisição.' }).optional().nullable(),
  dataInsercao: z.string({ invalid_type_error: 'Tipo não válido para data de inserção.' }).optional().nullable(),
  autor: z
    .object({
      id: z.string({ required_error: 'ID do autor não informado.', invalid_type_error: 'Tipo não válido para o ID do autor.' }),
      nome: z.string({ required_error: 'Nome do autor não informado.', invalid_type_error: 'Tipo não válido para o nome do autor.' }),
      avatar_url: z
        .string({ required_error: 'Avatar do autor não informado.', invalid_type_error: 'Tipo não válido para o Avatar do autor.' })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
})

export type TClient = z.infer<typeof ClientSchema>
export type TClientDTO = TClient & { _id: string }

export const ClientSearchQueryParams = z.object({
  page: z
    .number({ required_error: 'Parâmetro de páginação não informado.', invalid_type_error: 'Tipo não válido para o parâmetro de páginização.' })
    .min(1, 'Parâmetro de páginação inválido.'),
  name: z.string({ required_error: 'Filtro por nome não informado.', invalid_type_error: 'Tipo não válido para filtro por nome.' }),
  phone: z.string({ invalid_type_error: 'Tipo não válido para filtro por telefone.' }),
  acquisitionChannels: z.array(z.string({ invalid_type_error: 'Tipo não válido para filtro por canal de aquisição.' })),
  period: z.object({
    after: z.string({ invalid_type_error: 'Tipo não válido para parâmetro de período.' }).optional().nullable(),
    before: z.string({ invalid_type_error: 'Tipo não válido para parâmetro de período.' }).optional().nullable(),
  }),
})

export type TClientSearchQueryParams = z.infer<typeof ClientSearchQueryParams>
