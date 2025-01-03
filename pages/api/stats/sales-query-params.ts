import { apiHandler } from '@/lib/api'
import { TSale } from '@/schemas/sales'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Collection } from 'mongodb'
import { NextApiHandler } from 'next'

export type TSaleQueryFilterOptions = {
  saleNatures: string[]
  sellers: string[]
  productsGroups: string[]
}
const getSaleQueryFiltersRoute: NextApiHandler<{ data: TSaleQueryFilterOptions }> = async (req, res) => {
  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')

  const saleNaturesResult = await salesCollection.aggregate([{ $group: { _id: '$natureza' } }]).toArray()
  const saleNatures = saleNaturesResult.map((current) => current._id)
  const sellersResult = await salesCollection.aggregate([{ $group: { _id: '$vendedor' } }]).toArray()
  const sellers = sellersResult.map((current) => current._id)

  const productsGroupsResult = await salesCollection
    .aggregate([{ $unwind: { path: '$itens', preserveNullAndEmptyArrays: false } }, { $group: { _id: '$itens.grupo' } }])
    .toArray()
  const productsGroups = productsGroupsResult.map((current) => current._id)
  return res.status(200).json({ data: { saleNatures, sellers, productsGroups } })
}

export default apiHandler({ GET: getSaleQueryFiltersRoute })
