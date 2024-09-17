import { apiHandler } from '@/lib/api'
import { PeriodQueryParamSchema } from '@/schemas/query-params-utils'
import { TSale } from '@/schemas/sales'
import { TSaleItem } from '@/schemas/sales-items'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Collection, Filter } from 'mongodb'
import { NextApiHandler } from 'next'

type TSalesReduced = {
  faturamentoBruto: number
  gastoBruto: number
  qtdeVendas: number
  qtdeItensVendidos: number
  porGrupo: {
    [key: string]: { qtde: number; total: number }
  }
  porVendedor: {
    [key: string]: { qtde: number; total: number }
  }
}

export type TGeneralSalesStats = {
  faturamentoBruto: number
  faturamentoLiquido: number
  qtdeVendas: number
  ticketMedio: number
  qtdeItensVendidos: number
  itensPorVendaMedio: number
  porGrupo: {
    titulo: string
    qtde: number
    total: number
  }[]
  porVendedor: {
    titulo: string
    qtde: number
    total: number
  }[]
}

const getSalesDashboardStatsRoute: NextApiHandler<{ data: TGeneralSalesStats }> = async (req, res) => {
  const { after, before } = PeriodQueryParamSchema.parse(req.query)

  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')
  const salesItemsCollection: Collection<TSaleItem> = db.collection('sales-items')

  const sales = await getSales({ collection: salesCollection, after, before })

  const stats = sales.reduce(
    (acc: TSalesReduced, current) => {
      // updating general stats
      acc.faturamentoBruto += current.valor
      acc.qtdeVendas += 1
      acc.gastoBruto += current.itensVenda.reduce((acc, current) => acc + current.vcusto, 0)
      acc.qtdeItensVendidos += current.itensVenda.length

      // stats by seller
      if (!acc.porVendedor[current.vendedor]) acc.porVendedor[current.vendedor] = { qtde: 0, total: 0 }
      acc.porVendedor[current.vendedor].qtde += 1
      acc.porVendedor[current.vendedor].total += current.valor

      // stats by item
      current.itensVenda.forEach((item) => {
        if (!acc.porGrupo[item.grupo]) acc.porGrupo[item.grupo] = { qtde: 0, total: 0 }

        acc.porGrupo[item.grupo].qtde += 1
        acc.porGrupo[item.grupo].total += item.vprod
      })
      return acc
    },
    {
      faturamentoBruto: 0,
      gastoBruto: 0,
      qtdeVendas: 0,
      qtdeItensVendidos: 0,
      porGrupo: {},
      porVendedor: {},
    } as TSalesReduced
  )

  return res.status(200).json({
    data: {
      faturamentoBruto: stats.faturamentoBruto,
      faturamentoLiquido: stats.faturamentoBruto - stats.gastoBruto,
      qtdeVendas: stats.qtdeVendas,
      ticketMedio: stats.faturamentoBruto / stats.qtdeVendas,
      qtdeItensVendidos: stats.qtdeItensVendidos,
      itensPorVendaMedio: stats.qtdeItensVendidos / stats.qtdeVendas,
      porGrupo: Object.entries(stats.porGrupo)
        .map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
        .sort((a, b) => b.total - a.total),
      porVendedor: Object.entries(stats.porVendedor)
        .map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
        .sort((a, b) => b.total - a.total),
    },
  })
  // const stats = sales.reduce(
  //   (acc, current) => {
  //     return acc
  //   },
  //   {
  //     faturamento: 0,
  //     porVendedor: {},
  //   }
  // )
}

export default apiHandler({ GET: getSalesDashboardStatsRoute })

type GetSalesParams = {
  collection: Collection<TSale>
  after: string
  before: string
}

type TSaleResult = {
  cliente: TSale['cliente']
  dataVenda: TSale['dataVenda']
  natureza: TSale['natureza']
  parceiro: TSale['parceiro']
  valor: TSale['valor']
  vendedor: TSale['vendedor']
  itensVenda: {
    descricao: TSaleItem['descricao']
    qtde: TSaleItem['qtde']
    vprod: TSaleItem['vprod']
    vcusto: TSaleItem['vcusto']
    grupo: TSaleItem['grupo']
  }[]
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
      'itensVenda.descricao': 1,
      'itensVenda.qtde': 1,
      'itensVenda.vprod': 1,
      'itensVenda.vcusto': 1,
      'itensVenda.grupo': 1,
    }

    const result = await collection.aggregate([{ $match: match }, { $addFields: addFields }, { $lookup: lookup }, { $project: projection }]).toArray()
    return result as TSaleResult[]
  } catch (error) {
    throw error
  }
}
