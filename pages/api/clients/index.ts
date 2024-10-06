import { apiHandler } from '@/lib/api'
import { ClientSchema, TClient } from '@/schemas/clients'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import createHttpError from 'http-errors'
import { ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'

type GetResponse = {
  data: TClient | TClient[]
}
const getClientsRoute: NextApiHandler<GetResponse> = async (req, res) => {
  const { id } = req.query
  const db = await connectToDatabase()
  const collection = db.collection<TClient>('clients')

  if (id) {
    if (typeof id !== 'string' || !ObjectId.isValid(id)) throw new createHttpError.BadRequest('ID inválido.')
    const client = await collection.findOne({ _id: new ObjectId(id) })
    if (!client) throw new createHttpError.NotFound('Cliente não encontrado.')
    return res.status(200).json({ data: client })
  }

  const clients = await collection.find({}).toArray()
  return res.status(200).json({ data: clients })
}

type PostResponse = {
  data: { insertedId: string }
  message: string
}

const createClientRoute: NextApiHandler<PostResponse> = async (req, res) => {
  const client = ClientSchema.parse(req.body)
  const db = await connectToDatabase()
  const collection = db.collection<TClient>('clients')

  const insertResponse = await collection.insertOne({ ...client, dataInsercao: new Date().toISOString() })
  if (!insertResponse.acknowledged) throw new createHttpError.InternalServerError('Oops, houve um erro desconhecido ao criar cliente.')
  const insertedId = insertResponse.insertedId.toString()

  return res.status(201).json({ data: { insertedId }, message: 'Cliente criado com sucesso.' })
}
export default apiHandler({ POST: createClientRoute, GET: getClientsRoute })
