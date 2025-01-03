import { apiHandler } from '@/lib/api'
import { TClient } from '@/schemas/clients'
import { SalesGeneralStatsFiltersSchema, TSalesGeneralStatsFilters } from '@/schemas/query-params-utils'
import { TSaleGoal } from '@/schemas/sale-goals'
import { TSale } from '@/schemas/sales'
import { TSaleItem } from '@/schemas/sales-items'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import dayjs from 'dayjs'
import { Collection, Filter, ObjectId } from 'mongodb'
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
  faturamentoMeta: number
  faturamentoMetaPorcentagem: number
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
  const { period, total, sellers, saleNatures, clientRFMTitles, productGroups, excludedSalesIds } = SalesGeneralStatsFiltersSchema.parse(req.body)

  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')
  const goalsCollection: Collection<TSaleGoal> = db.collection('goals')

  const ajustedAfter = period.after
  const ajustedBefore = dayjs(period.before).endOf('day').toISOString()
  const sales = await getSales({
    collection: salesCollection,
    after: ajustedAfter,
    before: ajustedBefore,
    total,
    sellers,
    saleNatures,
    clientRFMTitles,
    productGroups,
    excludedSalesIds,
  })
  const overallSaleGoal = await getOverallSaleGoal({ collection: goalsCollection, after: ajustedAfter, before: ajustedBefore })
  const stats = sales.reduce(
    (acc: TSalesReduced, current) => {
      // updating sales quantity stats
      acc.qtdeVendas += 1

      // stats by seller
      if (!acc.porVendedor[current.vendedor]) acc.porVendedor[current.vendedor] = { qtde: 0, total: 0 }
      acc.porVendedor[current.vendedor].qtde += 1
      acc.porVendedor[current.vendedor].total += current.valor

      // stats by item
      current.itens
        .filter((item) => (productGroups.length > 0 ? productGroups.includes(item.grupo) : true))
        .forEach((item) => {
          if (!acc.porGrupo[item.grupo]) acc.porGrupo[item.grupo] = { qtde: 0, total: 0 }
          if (!acc.porItem[item.descricao]) acc.porItem[item.descricao] = { qtde: 0, total: 0 }

          // Updating other general stats
          acc.faturamentoBruto += item.vprod - item.vdesc
          acc.gastoBruto += item.vcusto
          acc.qtdeItensVendidos += item.qtde

          // Updating stats by group
          acc.porGrupo[item.grupo].qtde += 1
          acc.porGrupo[item.grupo].total += item.vprod - item.vdesc

          acc.porItem[item.descricao].qtde += 1
          acc.porItem[item.descricao].total += item.vprod - item.vdesc
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
      faturamentoMeta: overallSaleGoal,
      faturamentoMetaPorcentagem: (stats.faturamentoBruto / overallSaleGoal) * 100,
      qtdeVendas: stats.qtdeVendas,
      ticketMedio: stats.faturamentoBruto / stats.qtdeVendas,
      qtdeItensVendidos: stats.qtdeItensVendidos,
      itensPorVendaMedio: stats.qtdeItensVendidos / stats.qtdeVendas,
      valorDiarioVendido: stats.faturamentoBruto / dayjs(period.before).diff(dayjs(period.after), 'days'),
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
  total: TSalesGeneralStatsFilters['total']
  saleNatures: TSalesGeneralStatsFilters['saleNatures']
  sellers: TSalesGeneralStatsFilters['sellers']
  clientRFMTitles: TSalesGeneralStatsFilters['clientRFMTitles']
  productGroups: TSalesGeneralStatsFilters['productGroups']
  excludedSalesIds: TSalesGeneralStatsFilters['excludedSalesIds']
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
    vdesc: TSaleItem['vdesc']
    vcusto: TSaleItem['vcusto']
  }[]
  clienteDados: {
    analiseRFM: {
      titulo: TClient['analiseRFM']['titulo']
    }
  }
}
async function getSales({ collection, after, before, total, saleNatures, sellers, clientRFMTitles, productGroups, excludedSalesIds }: GetSalesParams) {
  try {
    function getQueryByTotal(total: TSalesGeneralStatsFilters['total']) {
      if (total.min && total.max) return { valor: { $gte: total.min, $lte: total.max } }
      if (total.min) return { valor: { $gte: total.min } }
      if (total.max) return { valor: { $lte: total.max } }
    }

    const queryPeriod = after && before ? { dataVenda: { $gte: after, $lte: before } } : {}
    const queryTotal = getQueryByTotal(total)
    const querySaleNature: Filter<TSale> = saleNatures.length > 0 ? { natureza: { $in: saleNatures } } : {}
    const querySeller: Filter<TSale> = sellers.length > 0 ? { vendedor: { $in: sellers } } : {}
    const queryProductGroups: Filter<TSale> = productGroups.length > 0 ? { 'itens.grupo': { $in: productGroups } } : {}
    const queryExcludedSalesIds: Filter<TSale> = excludedSalesIds.length > 0 ? { _id: { $nin: excludedSalesIds.map((id) => new ObjectId(id)) } } : {}
    const match: Filter<TSale> = { ...queryPeriod, ...queryTotal, ...querySaleNature, ...querySeller, ...queryProductGroups, ...queryExcludedSalesIds }
    const addFields = { $addFields: { clientIdAsObjectId: { $toObjectId: '$idCliente' } } }
    const lookupClient = { $lookup: { from: 'clients', localField: 'clientIdAsObjectId', foreignField: '_id', as: 'clienteDados' } }
    const postLookupMatch = { $match: { 'clienteDados.analiseRFM.titulo': clientRFMTitles.length > 0 ? { $in: clientRFMTitles } : { $ne: null } } }
    const projection = {
      $project: {
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
        'itens.vdesc': 1,
        'itens.vcusto': 1,
        'clienteDados.analiseRFM.titulo': 1,
      },
    }

    const result = await collection.aggregate([{ $match: match }, addFields, lookupClient, postLookupMatch, projection]).toArray()
    return result as TSaleResult[]
  } catch (error) {
    throw error
  }
}

type GetOverallSaleGoalProps = {
  collection: Collection<TSaleGoal>
  after: string
  before: string
}
async function getOverallSaleGoal({ collection, after, before }: GetOverallSaleGoalProps) {
  try {
    const goals = await collection.find({ $or: [{ inicio: { $lte: after } }, { fim: { $gte: before } }] }).toArray()
    console.log(goals)
    const applicableSaleGoal = goals.reduce((acc, current) => {
      const monthsGoalReduced = Object.values(current.meses).reduce((acc, monthCurrent) => {
        const afterDatetime = new Date(after).getTime()
        const beforeDatetime = new Date(before).getTime()

        const monthStartDatetime = new Date(monthCurrent.inicio).getTime()
        const monthEndDatetime = new Date(monthCurrent.fim).getTime()

        if (
          (afterDatetime < monthStartDatetime && beforeDatetime < monthStartDatetime) ||
          (afterDatetime > monthEndDatetime && beforeDatetime > monthEndDatetime)
        )
          return acc
        // Caso o período de filtro da query compreenda o mês inteiro
        if (afterDatetime <= monthStartDatetime && beforeDatetime >= monthEndDatetime) {
          return (acc += monthCurrent.vendas)
        } else {
          if (beforeDatetime > monthEndDatetime) {
            const applicableDays = dayjs(monthCurrent.fim).diff(dayjs(after), 'days')
            console.log('CAI NO CASO 2 - CASO 1', applicableDays, after, before, monthCurrent.inicio, monthCurrent.fim)

            return acc + (monthCurrent.vendas * applicableDays) / monthCurrent.dias
          } else {
            const applicableDays = dayjs(before).diff(dayjs(monthCurrent.inicio), 'days')
            console.log('CAI NO CASO 2 - CASO 2', applicableDays, after, before, monthCurrent.inicio, monthCurrent.fim)

            return acc + (monthCurrent.vendas * applicableDays) / monthCurrent.dias
          }
          return acc
        }
        return acc
      }, 0)
      return acc + monthsGoalReduced
    }, 0)

    return applicableSaleGoal
  } catch (error) {
    throw error
  }
}
