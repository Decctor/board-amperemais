import { z } from 'zod'

export const ClientSchema = z.object({
  nome: z.string({ required_error: 'Nome do cliente não informado.', invalid_type_error: 'Tipo não válido para o nome do cliente.' }),
})

export type TClient = z.infer<typeof ClientSchema>
