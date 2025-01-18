import { z } from 'zod'

export const ProductSchema = z.object({
  codigo: z.string({ required_error: 'Codigo do produto não informado.', invalid_type_error: 'Tipo não válido para codigo do produto.' }),
  nome: z.string({ required_error: 'Nome do produto não informado.', invalid_type_error: 'Tipo não válido para nome do produto.' }),
  unidade: z.string({ required_error: 'Unidade do produto não informado.', invalid_type_error: 'Tipo não válido para unidade do produto.' }),
  categoria: z.string({ required_error: 'Categoria do produto não informado.', invalid_type_error: 'Tipo não válido para categoria do produto.' }),
})
export type TProduct = z.infer<typeof ProductSchema>
