import { z } from 'zod'

export const UserSchema = z.object({
  nome: z.string({ required_error: 'Nome do usuário não informado.', invalid_type_error: 'Tipo não válido para o nome do usuário.' }),
  usuario: z.string({ required_error: 'Usuário não informado.', invalid_type_error: 'Tipo não válido para o nome do usuário.' }),
  avatar: z.string({ invalid_type_error: 'Tipo não válido para avatar do usuário.' }).optional().nullable(),
  email: z.string({ required_error: 'Email do usuário não informado.', invalid_type_error: 'Tipo não válido para o email do usuário.' }).optional().nullable(),
  senha: z.string({ required_error: 'Senha do usuário não informada.', invalid_type_error: 'Tipo não válido para a senha do usuário.' }),
  visualizacao: z.enum(['GERAL', 'PRÓPRIA']),
  vendedor: z.string({ required_error: 'Vendedor do usuário não informado.', invalid_type_error: 'Tipo não válido para o vendedor do usuário.' }),
  dataInsercao: z.string({
    required_error: 'Data de inserção do usuário não informada.',
    invalid_type_error: 'Tipo não válido para a data de inserção do usuário.',
  }),
})
export type TSession = { user_id: string; expires_at: Date }
export type TUser = z.infer<typeof UserSchema>

export type TUserDTO = TUser & { _id: string }
export type TUserSession = Omit<TUserDTO, 'senha'>
