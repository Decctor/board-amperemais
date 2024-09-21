import clientPromise from '@/services/mongodb/mongo-client'
import { Lucia, TimeSpan } from 'lucia'
import { Collection, MongoClient } from 'mongodb'
import { MongodbAdapter } from '@lucia-auth/adapter-mongodb'
import { TUser, TUserDTO } from '@/schemas/users'

const client = await clientPromise

const db = client.db('ampere-mais')
const User = db.collection('users') as Collection<UserDoc>
const Session = db.collection('sessions') as Collection<SessionDoc>

const adapter = new MongodbAdapter(Session, User)

interface UserDoc extends TUser {
  _id: string
}

interface SessionDoc {
  _id: string
  expires_at: Date
  user_id: string
}
export const lucia = new Lucia(adapter, {
  getUserAttributes: (attributes) => {
    return {
      id: attributes._id,
      nome: attributes.nome,
      email: attributes.email,
      visualizacao: attributes.visualizacao,
      vendedor: attributes.vendedor,
      dataInsercao: attributes.dataInsercao,
    }
  },
  sessionCookie: {
    attributes: {
      // set to `true` when using HTTPS
      secure: process.env.NODE_ENV === 'production',
    },
  },
  sessionExpiresIn: new TimeSpan(30, 'd'),
})

// IMPORTANT!
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseSessionAttributes: DatabaseSessionAttributes
    DatabaseUserAttributes: DatabaseUserAttributes
  }
}

interface DatabaseSessionAttributes {}
interface DatabaseUserAttributes extends Omit<TUserDTO, 'senha'> {}
