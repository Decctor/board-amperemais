import { NextApiRequest } from 'next'
import { SaleSimplifiedProjection, SalesSimplifiedSearchQueryParams, TSale, TSaleSimplified, TSaleSimplifiedDTO } from '@/schemas/sales'
import { NextApiHandler } from 'next'
import { Collection, Filter } from 'mongodb'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { apiHandler } from '@/lib/api'

export type TSalesSimplifiedSearchResult = {
  sales: TSaleSimplifiedDTO[]
  salesMatched: number
  totalPages: number
}
type GetResponse = {
  data: TSalesSimplifiedSearchResult
}
const getSalesSimplifiedRoute: NextApiHandler<GetResponse> = async (req, res) => {
  const PAGE_SIZE = 50
  const { search, page } = SalesSimplifiedSearchQueryParams.parse(req.body)
  const db = await connectToDatabase()
  const collection: Collection<TSale> = db.collection('sales')

  const orSearchQuery = search.length > 0 ? [{ cliente: search }, { cliente: { $regex: search, $options: 'i' } }] : []

  const query: Filter<TSale> = orSearchQuery.length > 0 ? { $or: [...orSearchQuery] } : {}

  const skip = (page - 1) * PAGE_SIZE
  const limit = PAGE_SIZE

  const salesMatched = await collection.countDocuments(query)
  const totalPages = Math.ceil(salesMatched / PAGE_SIZE)

  const salesResult = await collection.find(query, { skip, limit, projection: SaleSimplifiedProjection }).toArray()

  return res.status(200).json({ data: { sales: salesResult as any[], salesMatched, totalPages } })
}

export default apiHandler({ POST: getSalesSimplifiedRoute })
