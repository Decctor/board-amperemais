import { apiHandler } from '@/lib/api'
import { TClient } from '@/schemas/clients'
import { TSale } from '@/schemas/sales'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import createHttpError from 'http-errors'
import { ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'

type GetResponse = {
  data: string[]
}
const getSaleItemsRoute: NextApiHandler<GetResponse> = async (req, res) => {
  const db = await connectToDatabase()
  const collection = db.collection<TSale>('sales')

  const items = await collection
    .aggregate([
      {
        $unwind: {
          path: '$itens',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $group: {
          _id: '$itens.descricao',
          descricao: { $first: '$itens.descricao' },
          unidade: { $first: '$itens.unidade' },
          valorunit: { $first: '$itens.valorunit' },
          vprod: { $first: '$itens.vprod' },
          vcusto: { $first: '$itens.vcusto' },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ])
    .toArray()

  const itemsNames = items.map((item) => item._id)
  return res.status(200).json({ data: itemsNames })
}

export default apiHandler({ GET: getSaleItemsRoute })
