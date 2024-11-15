import connectToDatabase from '@/services/mongodb/main-db-connection'
import { TItemsSearchQueryParams } from './search'
import { TSaleItem, TSaleItemSimplifiedDTO } from '@/schemas/sales-items'
import { apiHandler } from '@/lib/api'
import { NextApiHandler } from 'next'

export type TItemsExport = {
  DESCRICAO: string
  UNIDADE: string
  'VALOR DE VENDA (UN)': number
  'VALOR DE CUSTO (UN)': number
  'MARGEM DE LUCRO': number
}

type GetResponse = {
  data: TItemsExport[]
}
const getItemsExport: NextApiHandler<GetResponse> = async (req, res) => {
  const db = await connectToDatabase()
  const collection = db.collection<TSaleItem>('sales')

  const items = (await collection
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
          qtde: { $first: '$itens.qtde' },
          unidade: { $first: '$itens.unidade' },
          valorunit: { $first: '$itens.valorunit' },
          vprod: { $first: '$itens.vprod' },
          vcusto: { $first: '$itens.vcusto' },
        },
      },
    ])
    .toArray()) as (TSaleItemSimplifiedDTO & { qtde: number })[]

  const itemsFormatted = items.map((item) => {
    const saleValue = item.valorunit
    const costValue = item.vcusto / item.qtde
    const margin = (saleValue - costValue) / saleValue
    return {
      DESCRICAO: item.descricao,
      UNIDADE: item.unidade,
      'VALOR DE VENDA (UN)': saleValue,
      'VALOR DE CUSTO (UN)': costValue,
      'MARGEM DE LUCRO': margin,
    }
  })
  return res.status(200).json({ data: itemsFormatted })
}

export default apiHandler({ GET: getItemsExport })
