import { apiHandler } from '@/lib/api'
import { getUserSession } from '@/lib/auth/session'
import { TClient } from '@/schemas/clients'
import { SalesGeneralStatsFiltersSchema, TSalesGeneralStatsFilters, TSaleStatsGeneralQueryParams } from '@/schemas/query-params-utils'
import { TSaleGoal } from '@/schemas/sale-goals'
import { TSale } from '@/schemas/sales'
import { TSaleItem } from '@/schemas/sales-items'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import dayjs from 'dayjs'
import { Collection, Filter, ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'

type TOverallSalesStatsReduced = {
  faturamentoBruto: number
  gastoBruto: number
  qtdeVendas: number
  qtdeItensVendidos: number
}

export type TOverallSalesStats = {
  faturamentoBruto: number
  faturamentoLiquido: number
  faturamentoMeta: number
  faturamentoMetaPorcentagem: number
  qtdeVendas: number
  ticketMedio: number
  qtdeItensVendidos: number
  itensPorVendaMedio: number
  valorDiarioVendido: number
}
type GetResponse = {
  data: TOverallSalesStats
}
const getSalesOverallStatsRoute: NextApiHandler<GetResponse> = async (req, res) => {
  const user = await getUserSession({ request: req })

  const filters = SalesGeneralStatsFiltersSchema.parse(req.body)

  const db = await connectToDatabase()
  const salesCollection = db.collection<TSale>('sales')
  const goalsCollection = db.collection<TSaleGoal>('goals')

  const sales = await getSales({ collection: salesCollection, filters })
  const overallSaleGoal = await getOverallSaleGoal({ collection: goalsCollection, after: filters.period.after, before: filters.period.before })

  const stats = sales.reduce(
    (acc: TOverallSalesStatsReduced, current) => {
      // updating sales quantity stats
      acc.qtdeVendas += 1

      // stats by item
      current.itens
        .filter((item) => (filters.productGroups.length > 0 ? filters.productGroups.includes(item.grupo) : true))
        .forEach((item) => {
          // Updating other general stats
          acc.faturamentoBruto += item.vprod - item.vdesc
          acc.gastoBruto += item.vcusto
          acc.qtdeItensVendidos += item.qtde
        })
      return acc
    },
    {
      faturamentoBruto: 0,
      gastoBruto: 0,
      qtdeVendas: 0,
      qtdeItensVendidos: 0,
    } as TOverallSalesStatsReduced
  )

  const overallStats: TOverallSalesStats = {
    faturamentoBruto: stats.faturamentoBruto,
    faturamentoLiquido: stats.faturamentoBruto - stats.gastoBruto,
    faturamentoMeta: overallSaleGoal,
    faturamentoMetaPorcentagem: (stats.faturamentoBruto / overallSaleGoal) * 100,
    qtdeVendas: stats.qtdeVendas,
    ticketMedio: stats.faturamentoBruto / stats.qtdeVendas,
    qtdeItensVendidos: stats.qtdeItensVendidos,
    itensPorVendaMedio: stats.qtdeItensVendidos / stats.qtdeVendas,
    valorDiarioVendido: stats.faturamentoBruto / dayjs(filters.period.before).diff(dayjs(filters.period.after), 'days'),
  }
  return res.status(200).json({ data: overallStats })
}

export default apiHandler({
  POST: getSalesOverallStatsRoute,
})

type TGetSalesResult = {
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

type GetSalesParams = {
  collection: Collection<TSale>
  filters: TSaleStatsGeneralQueryParams
}
async function getSales({ collection, filters }: GetSalesParams) {
  const ajustedAfter = filters.period.after
  const ajustedBefore = dayjs(filters.period.before).endOf('day').toISOString()
  try {
    function getQueryByTotal(total: TSaleStatsGeneralQueryParams['total']) {
      if (total.min && total.max) return { valor: { $gte: total.min, $lte: total.max } }
      if (total.min) return { valor: { $gte: total.min } }
      if (total.max) return { valor: { $lte: total.max } }
    }

    const queryPeriod = ajustedAfter && ajustedBefore ? { dataVenda: { $gte: ajustedAfter, $lte: ajustedBefore } } : {}
    const queryTotal = getQueryByTotal(filters.total)
    const querySaleNature: Filter<TSale> = filters.saleNatures.length > 0 ? { natureza: { $in: filters.saleNatures } } : {}
    const querySeller: Filter<TSale> = filters.sellers.length > 0 ? { vendedor: { $in: filters.sellers } } : {}
    const queryProductGroups: Filter<TSale> = filters.productGroups.length > 0 ? { 'itens.grupo': { $in: filters.productGroups } } : {}
    const queryExcludedSalesIds: Filter<TSale> =
      filters.excludedSalesIds.length > 0 ? { _id: { $nin: filters.excludedSalesIds.map((id) => new ObjectId(id)) } } : {}
    const match: Filter<TSale> = { ...queryPeriod, ...queryTotal, ...querySaleNature, ...querySeller, ...queryProductGroups, ...queryExcludedSalesIds }
    const addFields = { $addFields: { clientIdAsObjectId: { $toObjectId: '$idCliente' } } }
    const lookupClient = { $lookup: { from: 'clients', localField: 'clientIdAsObjectId', foreignField: '_id', as: 'clienteDados' } }
    const postLookupMatch = {
      $match: { 'clienteDados.analiseRFM.titulo': filters.clientRFMTitles.length > 0 ? { $in: filters.clientRFMTitles } : { $ne: null } },
    }
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
    return result as TGetSalesResult[]
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
  const ajustedAfter = after
  const ajustedBefore = dayjs(before).endOf('day').toISOString()
  try {
    const goals = await collection.find({ $or: [{ inicio: { $lte: ajustedAfter } }, { fim: { $gte: ajustedBefore } }] }).toArray()
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
