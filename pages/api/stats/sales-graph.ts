import { apiHandler } from '@/lib/api'
import { getDayStringsBetweenDates, getYearStringsBetweenDates } from '@/lib/dates'
import { SalesGraphFilterSchema, TSalesGraphFilters } from '@/schemas/query-params-utils'
import { TSale } from '@/schemas/sales'
import { TSaleItem } from '@/schemas/sales-items'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { TIntervalGrouping } from '@/utils/graphs'
import dayjs from 'dayjs'
import { Collection, Filter, ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'

export type TSaleGraph = {
  chave: string
  qtde: number
  total: number
}[]

const getSalesGraphStatsRoute: NextApiHandler<{ data: TSaleGraph }> = async (req, res) => {
  const filters = SalesGraphFilterSchema.parse(req.body)

  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')

  const sales = await getSales({ collection: salesCollection, filters })

  const stats = sales.reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
    const total = current.itens
      .filter((item) => (filters.productGroups.length > 0 ? filters.productGroups.includes(item.grupo) : true))
      .reduce((acc, item) => acc + item.vprod - item.vdesc, 0)
    if (filters.group == 'DIA') {
      const saleDay = dayjs(current.dataVenda).format('DD/MM')
      acc[saleDay].qtde += 1
      acc[saleDay].total += total
    }
    if (filters.group == 'MÊS') {
      const saleMonth = dayjs(current.dataVenda).month() + 1
      acc[`${saleMonth}`].qtde += 1
      acc[`${saleMonth}`].total += total
    }
    if (filters.group == 'BIMESTRE') {
      const saleBimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 2)}º`
      acc[saleBimester].qtde += 1
      acc[saleBimester].total += total
    }
    if (filters.group == 'TRIMESTRE') {
      const saleTrimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 3)}º`
      acc[saleTrimester].qtde += 1
      acc[saleTrimester].total += total
    }
    if (filters.group == 'SEMESTRE') {
      const saleTrimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 6)}º`
      acc[saleTrimester].qtde += 1
      acc[saleTrimester].total += total
    }
    if (filters.group == 'ANO') {
      const saleYear = dayjs(current.dataVenda).year()
      acc[saleYear].qtde += 1
      acc[saleYear].total += total
    }
    return acc
  }, getInitialGroupReduce({ initialDate: filters.period.after, endDate: filters.period.before, group: filters.group }))

  return res.status(200).json({ data: Object.entries(stats).map(([key, value]) => ({ chave: key, ...value })) })
}

export default apiHandler({ POST: getSalesGraphStatsRoute })

function getInitialGroupReduce({ initialDate, endDate, group }: { initialDate: string; endDate: string; group: TIntervalGrouping }): {
  [key: string]: { qtde: number; total: number }
} {
  if (group == 'DIA') {
    const datesStrs = getDayStringsBetweenDates({ initialDate, endDate })
    return datesStrs.reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
      acc[current] = { qtde: 0, total: 0 }
      return acc
    }, {})
  }
  if (group == 'MÊS') {
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
      acc[current] = { qtde: 0, total: 0 }
      return acc
    }, {})
  }
  if (group == 'BIMESTRE') {
    return ['1º', '2º', '3º', '4º', '5º', '6º'].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
      acc[current] = { qtde: 0, total: 0 }
      return acc
    }, {})
  }
  if (group == 'TRIMESTRE') {
    return ['1º', '2º', '3º', '4º'].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
      acc[current] = { qtde: 0, total: 0 }
      return acc
    }, {})
  }
  if (group == 'SEMESTRE') {
    return ['1º', '2º'].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
      acc[current] = { qtde: 0, total: 0 }
      return acc
    }, {})
  }
  if (group == 'ANO') {
    const datesStrs = getYearStringsBetweenDates({ initialDate, endDate })

    return datesStrs.reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
      acc[current] = { qtde: 0, total: 0 }
      return acc
    }, {})
  }
  return {}
}

type TSaleResult = {
  dataVenda: TSale['dataVenda']
  valor: TSale['valor']
  itens: {
    vprod: TSaleItem['vprod']
    vdesc: TSaleItem['vdesc']
    grupo: TSaleItem['grupo']
  }[]
}
type GetSalesParams = {
  collection: Collection<TSale>
  filters: TSalesGraphFilters
}
async function getSales({ collection, filters }: GetSalesParams) {
  try {
    function getQueryByTotal(total: TSalesGraphFilters['total']) {
      if (total.min && total.max) return { valor: { $gte: total.min, $lte: total.max } }
      if (total.min) return { valor: { $gte: total.min } }
      if (total.max) return { valor: { $lte: total.max } }
    }
    const queryPeriod = filters.period.after && filters.period.before ? { dataVenda: { $gte: filters.period.after, $lte: filters.period.before } } : {}
    const queryTotal = getQueryByTotal(filters.total)
    const saleNaturesQuery: Filter<TSale> = filters.saleNatures.length > 0 ? { natureza: { $in: filters.saleNatures } } : {}
    const sellersQuery: Filter<TSale> = filters.sellers.length > 0 ? { vendedor: { $in: filters.sellers } } : {}
    const queryProductGroups: Filter<TSale> = filters.productGroups.length > 0 ? { 'itens.grupo': { $in: filters.productGroups } } : {}
    const queryExcludedSalesIds: Filter<TSale> =
      filters.excludedSalesIds.length > 0 ? { _id: { $nin: filters.excludedSalesIds.map((id) => new ObjectId(id)) } } : {}
    const match: Filter<TSale> = { ...queryPeriod, ...queryTotal, ...saleNaturesQuery, ...sellersQuery, ...queryProductGroups, ...queryExcludedSalesIds }
    const addFields = { $addFields: { clientIdAsObjectId: { $toObjectId: '$idCliente' } } }
    const lookupClient = { $lookup: { from: 'clients', localField: 'clientIdAsObjectId', foreignField: '_id', as: 'clienteDados' } }
    const postLookupMatch = {
      $match: { 'clienteDados.analiseRFM.titulo': filters.clientRFMTitles.length > 0 ? { $in: filters.clientRFMTitles } : { $ne: null } },
    }
    const projection = {
      $project: {
        dataVenda: 1,
        valor: 1,
        'itens.vprod': 1,
        'itens.vdesc': 1,
        'itens.grupo': 1,
      },
    }
    const result = await collection.aggregate([{ $match: match }, addFields, lookupClient, postLookupMatch, projection]).toArray()

    return result as TSaleResult[]
  } catch (error) {
    throw error
  }
}
