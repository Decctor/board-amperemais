import { apiHandler } from '@/lib/api'
import {
  ClientSearchQueryParams,
  ClientSimplifiedProjection,
  type TClient,
  type TClientDTO,
  type TClientSearchQueryParams,
  type TClientSimplifiedDTO,
  type TClientSimplifiedWithSalesDTO,
} from '@/schemas/clients'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { type Collection, type Filter, ObjectId } from 'mongodb'
import type { NextApiHandler } from 'next'

export type TClientsBySearch = { clients: TClientSimplifiedDTO[]; clientsMatched: number; totalPages: number }
const getClientsBySearchRoute: NextApiHandler<{ data: TClientsBySearch }> = async (req, res) => {
  const PAGE_SIZE = 100

  const db = await connectToDatabase()
  const collection = db.collection<TClient>('clients')

  const filters = ClientSearchQueryParams.parse(req.body)

  const skip = PAGE_SIZE * (Number(filters.page) - 1)
  const limit = PAGE_SIZE

  const { clients: firstFiltersClients, clientsMatched: firstFiltersClientsMatched } = await getClients({ collection, filters, skip, limit })

  // If no filters are applied, return the first filters clients
  if (filters.rfmTitles.length === 0 && filters.period.after === null && filters.period.before === null) {
    const totalPages = Math.round(firstFiltersClientsMatched / PAGE_SIZE)

    return res.status(200).json({ data: { clients: firstFiltersClients, clientsMatched: firstFiltersClientsMatched, totalPages } })
  }


  return res.status(200).json({ data: { clients: firstFiltersClients, clientsMatched: firstFiltersClientsMatched, totalPages } })
}

export default apiHandler({ POST: getClientsBySearchRoute })

type GetClientsParams = {
  collection: Collection<TClient>
  filters: TClientSearchQueryParams
  skip: number
  limit: number
}
async function getClients({ collection, filters, skip, limit }: GetClientsParams) {
  const nameOrQuery: Filter<TClient>[] = filters.name.trim().length > 0 ? [{ nome: { $regex: filters.name, $options: 'i' } }, { nome: filters.name }] : []
  const phoneOrQuery: Filter<TClient>[] =
    filters.phone.trim().length > 0 ? [{ telefone: { $regex: filters.phone, $options: 'i' } }, { telefone: filters.phone }] : []
  const acquisitionChannelsQuery: Filter<TClient> = filters.acquisitionChannels.length > 0 ? { canalAquisicao: { $in: filters.acquisitionChannels } } : {}

  const rfmTitlesQuery: Filter<TClient> = filters.rfmTitles.length > 0 ? { 'analiseRFM.titulo': { $in: filters.rfmTitles } } : {}

  const orQueries = [...nameOrQuery, ...phoneOrQuery]
  const orQuery = orQueries.length > 0 ? { $or: orQueries } : {}
  const query = { _id: { $ne: new ObjectId('66ef0e4f9f7840d7584fb768') }, ...orQuery, ...acquisitionChannelsQuery, ...rfmTitlesQuery }

  const clientsMatched = await collection.countDocuments({ ...query })

  const clients = (await collection
    .aggregate([
      { $match: query },
      { $sort: { dataUltimaCompra: -1 } },
      { $project: ClientSimplifiedProjection },
      { $skip: skip },
      { $limit: limit },
    ])
    .toArray()) as TClientSimplifiedDTO[]

  return { clients, clientsMatched }
}
