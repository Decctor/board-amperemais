import { PeriodQueryParamSchema } from '@/schemas/query-params-utils'
import { TSale } from '@/schemas/sales'
import { TSaleItem } from '@/schemas/sales-items'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Collection, Filter } from 'mongodb'
import { NextApiHandler } from 'next'

const getSalesDashboardStatsRoute: NextApiHandler<any> = async (req, res) => {
  const { after, before } = PeriodQueryParamSchema.parse(req.query)

  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')
  const salesItemsCollection: Collection<TSaleItem> = db.collection('sales-items')

  const sales = await salesCollection
    .find(
      {
        $and: [{ dataVenda: { $gte: after } }, { dataVenda: { $lte: before } }],
      },
      {
        projection: {
          cliente: 1,
          dataVenda: 1,
          natureza: 1,
          parceiro: 1,
          valor: 1,
          vendedor: 1,
        },
      }
    )
    .toArray()

  const stats = sales.reduce(
    (acc, current) => {
      return acc
    },
    {
      faturamento: 0,
      porVendedor: {},
    }
  )
}

type GetSalesParams = {
  collection: Collection<TSale>
  after: string
  before: string
}
async function getSales({ collection, after, before }: GetSalesParams) {
  try {
    const match: Filter<TSale> = { $and: [{ dataVenda: { $gte: after } }, { dataVenda: { $lte: before } }] }
    const addFields = { idAsString: { $toString: '$_id' } }
    const lookup = { from: 'sales-items', localField: 'idAsString', foreignField: 'idVenda', as: 'itensVenda' }
    const projection = {
      cliente: 1,
      dataVenda: 1,
      natureza: 1,
      parceiro: 1,
      valor: 1,
      vendedor: 1,
    }
  } catch (error) {}
}
