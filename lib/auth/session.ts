import connectToDatabase from '@/services/mongodb/main-db-connection'
import { lucia } from './lucia'
import { TSession, TUser } from '@/schemas/users'
import createHttpError from 'http-errors'
import { ObjectId } from 'mongodb'
import { NextApiRequest } from 'next'

type GetUserSessionProps = {
  request: NextApiRequest
}
export async function getUserSession({ request }: GetUserSessionProps) {
  const sessionId = request.cookies[lucia.sessionCookieName]
  console.log('SESSION ID', sessionId)

  const db = await connectToDatabase()
  const sessionsCollection = db.collection<TSession>('sessions')
  const usersCollection = db.collection<TUser>('users')
  if (!sessionId) throw new createHttpError.NotFound('Sessão de usuário não encontrada.')

  // @ts-ignore
  const session = await sessionsCollection.findOne({ _id: sessionId })
  if (!session) throw new createHttpError.NotFound('Sessão de usuário não encontrada.')

  const userId = session.user_id
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { senha: 0 } })
  if (!user) throw new createHttpError.NotFound('Sessão de usuário não encontrada.')

  return user
}
