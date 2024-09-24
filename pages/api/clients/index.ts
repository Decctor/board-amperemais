import { apiHandler } from '@/lib/api'
import { TClient } from '@/schemas/clients'
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

export default apiHandler({ GET: getClientsRoute })
