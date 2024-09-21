import { apiHandler } from '@/lib/api'
import { PeriodQueryParamSchema } from '@/schemas/query-params-utils'
import { SalesQueryFilters, TSale, TSalesQueryFilter } from '@/schemas/sales'
import { TSaleItem } from '@/schemas/sales-items'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import dayjs from 'dayjs'
import { Collection, Filter } from 'mongodb'
import { NextApiHandler } from 'next'

type TSalesReduced = {
  faturamentoBruto: number
  gastoBruto: number
  qtdeVendas: number
  qtdeItensVendidos: number
  porItem: {
    [key: string]: { qtde: number; total: number }
  }
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
  valorDiarioVendido: number
  porItem: {
    titulo: string
    qtde: number
    total: number
  }[]
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
  const filters = SalesQueryFilters.parse(req.body)

  console.log('PARÂMETRO DE PERÍODO', after, before)
  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')

  const sales = await getSales({ collection: salesCollection, after, before, filters })
  const stats = sales.reduce(
    (acc: TSalesReduced, current) => {
      // updating general stats
      acc.faturamentoBruto += current.valor
      acc.qtdeVendas += 1
      acc.gastoBruto += current.custoTotal
      acc.qtdeItensVendidos += current.itens.length

      // stats by seller
      if (!acc.porVendedor[current.vendedor]) acc.porVendedor[current.vendedor] = { qtde: 0, total: 0 }
      acc.porVendedor[current.vendedor].qtde += 1
      acc.porVendedor[current.vendedor].total += current.valor

      // stats by item
      current.itens.forEach((item) => {
        if (!acc.porGrupo[item.grupo]) acc.porGrupo[item.grupo] = { qtde: 0, total: 0 }
        if (!acc.porItem[item.descricao]) acc.porItem[item.descricao] = { qtde: 0, total: 0 }

        acc.porGrupo[item.grupo].qtde += 1
        acc.porGrupo[item.grupo].total += item.vprod

        acc.porItem[item.descricao].qtde += 1
        acc.porItem[item.descricao].total += item.vprod
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
      porItem: {},
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
      valorDiarioVendido: stats.faturamentoBruto / dayjs(before).diff(dayjs(after), 'days'),
      porItem: Object.entries(stats.porItem)
        .map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
        .sort((a, b) => b.total - a.total),
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

export default apiHandler({ POST: getSalesDashboardStatsRoute })

type GetSalesParams = {
  collection: Collection<TSale>
  after: string
  before: string
  filters: TSalesQueryFilter
}

type TSaleResult = {
  cliente: TSale['cliente']
  dataVenda: TSale['dataVenda']
  natureza: TSale['natureza']
  parceiro: TSale['parceiro']
  valor: TSale['valor']
  custoTotal: TSale['custoTotal']
  vendedor: TSale['vendedor']
  itens: {
    descricao: TSaleItem['descricao']
    qtde: TSaleItem['qtde']
    vprod: TSaleItem['vprod']
    grupo: TSaleItem['grupo']
  }[]
}
async function getSales({ collection, after, before, filters }: GetSalesParams) {
  try {
    function getAndQuery() {
      var andQuery: any[] = [{ dataVenda: { $gte: after } }, { dataVenda: { $lte: before } }]
      if (!!filters.total.min && !!filters.total.max) andQuery = [...andQuery, { valor: { $gte: filters.total.min } }, { valor: { $lte: filters.total.max } }]

      return { $and: andQuery }
    }
    const andQuery = getAndQuery()
    const querySaleNature: Filter<TSale> = filters.saleNature.length > 0 ? { natureza: { $in: filters.saleNature } } : {}

    const querySeller: Filter<TSale> = filters.sellers.length > 0 ? { vendedor: { $in: filters.sellers } } : {}
    const match: Filter<TSale> = { ...andQuery, ...querySaleNature, ...querySeller }
    const projection = {
      cliente: 1,
      dataVenda: 1,
      natureza: 1,
      parceiro: 1,
      valor: 1,
      custoTotal: 1,
      vendedor: 1,
      'itens.descricao': 1,
      'itens.qtde': 1,
      'itens.vprod': 1,
      'itens.grupo': 1,
    }

    const result = await collection.aggregate([{ $match: match }, { $project: projection }]).toArray()
    return result as TSaleResult[]
  } catch (error) {
    throw error
  }
}
