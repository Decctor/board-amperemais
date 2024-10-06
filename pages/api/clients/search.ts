import { apiHandler } from '@/lib/api'
import { ClientSearchQueryParams, TClient, TClientDTO } from '@/schemas/clients'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Filter } from 'mongodb'
import { NextApiHandler } from 'next'

export type TClientsBySearch = { clients: TClientDTO[]; clientsMatched: number; totalPages: number }
const getClientsBySearchRoute: NextApiHandler<{ data: TClientsBySearch }> = async (req, res) => {
  const PAGE_SIZE = 500

  const db = await connectToDatabase()
  const collection = db.collection<TClient>('clients')

  const { page, name, phone, acquisitionChannels, period } = ClientSearchQueryParams.parse(req.body)

  const nameQuery: Filter<TClient> = name.trim().length > 0 ? { $or: [{ nome: { $regex: name, $options: 'i' } }, { nome: name }] } : {}
  const phoneQuery: Filter<TClient> = phone.trim().length > 0 ? { $or: [{ telefone: { $regex: phone, $options: 'i' } }, { telefone: phone }] } : {}
  const acquisitionChannelsQuery: Filter<TClient> = acquisitionChannels.length > 0 ? { canalAquisicao: { $in: acquisitionChannels } } : {}
  const periodQuery: Filter<TClient> = period.after && period.before ? { dataInsercao: { $gte: period.after, $lte: period.before } } : {}

  const query = { ...nameQuery, ...phoneQuery, ...acquisitionChannelsQuery, ...periodQuery }

  const skip = PAGE_SIZE * (Number(page) - 1)
  const limit = PAGE_SIZE

  const clientsMatched = await collection.countDocuments({ ...query })

  const clientsResult = await collection
    .find({ ...query })
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()

  const clients = clientsResult.map((c) => ({ ...c, _id: c._id.toString() }))
  const totalPages = Math.round(clientsMatched / PAGE_SIZE)

  return res.status(200).json({ data: { clients, clientsMatched, totalPages } })
}

export default apiHandler({ POST: getClientsBySearchRoute })
