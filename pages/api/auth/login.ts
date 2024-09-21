import { apiHandler } from '@/lib/api'
import { lucia } from '@/lib/auth/lucia'
import { TUser } from '@/schemas/users'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import createHttpError from 'http-errors'
import { Collection } from 'mongodb'
import { NextApiHandler } from 'next'
import { z } from 'zod'

const LoginInputSchema = z.object({
  username: z.string({ required_error: 'Usuário não informado.', invalid_type_error: 'Tipo não válido para o usuário.' }),
  password: z.string({ required_error: 'Senha não informada.', invalid_type_error: 'Tipo não válido para a senha.' }),
})
type PostResponse = {}
const handleLoginRoute: NextApiHandler<PostResponse> = async (req, res) => {
  const { username, password } = LoginInputSchema.parse(req.body)
  const db = await connectToDatabase()

  const usersCollection: Collection<TUser> = db.collection('users')

  const existingUser = await usersCollection.findOne({ usuario: username })
  if (!existingUser) throw new createHttpError.BadRequest('Usuário ou senha incorretos.')

  const passwordMatch = password === existingUser.senha
  if (!passwordMatch) throw new createHttpError.BadRequest('Usuário ou senha incorretos.')

  const session = await lucia.createSession(existingUser._id.toString(), {})
  return res.appendHeader('Set-Cookie', lucia.createSessionCookie(session.id).serialize()).status(200).json({
    success: true,
  })
}

export default apiHandler({ POST: handleLoginRoute })
