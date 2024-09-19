import { apiHandler } from '@/lib/api'
import { getDayStringsBetweenDates, getYearStringsBetweenDates } from '@/lib/dates'
import { PeriodQueryParamWithGroupingSchema } from '@/schemas/query-params-utils'
import { TSale } from '@/schemas/sales'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { TIntervalGrouping } from '@/utils/graphs'
import dayjs from 'dayjs'
import { Collection, Filter } from 'mongodb'
import { NextApiHandler } from 'next'

export type TSaleGraph = {
  chave: string
  qtde: number
  total: number
}[]

const getSalesGraphStatsRoute: NextApiHandler<{ data: TSaleGraph }> = async (req, res) => {
  const { period, group } = PeriodQueryParamWithGroupingSchema.parse(req.body)

  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')

  const sales = await getSales({ collection: salesCollection, after: period.after, before: period.before })

  const stats = sales.reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
    if (group == 'DIA') {
      const saleDay = dayjs(current.dataVenda).format('DD/MM')
      acc[saleDay].qtde += 1
      acc[saleDay].total += current.valor
    }
    if (group == 'MÊS') {
      const saleMonth = dayjs(current.dataVenda).month() + 1
      acc[`${saleMonth}`].qtde += 1
      acc[`${saleMonth}`].total += current.valor
    }
    if (group == 'BIMESTRE') {
      const saleBimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 2)}º`
      acc[saleBimester].qtde += 1
      acc[saleBimester].total += current.valor
    }
    if (group == 'TRIMESTRE') {
      const saleTrimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 3)}º`
      acc[saleTrimester].qtde += 1
      acc[saleTrimester].total += current.valor
    }
    if (group == 'SEMESTRE') {
      const saleTrimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 6)}º`
      acc[saleTrimester].qtde += 1
      acc[saleTrimester].total += current.valor
    }
    if (group == 'ANO') {
      const saleYear = dayjs(current.dataVenda).year()
      acc[saleYear].qtde += 1
      acc[saleYear].total += current.valor
    }
    return acc
  }, getInitialGroupReduce({ initialDate: period.after, endDate: period.before, group }))

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
  cliente: TSale['cliente']
  dataVenda: TSale['dataVenda']
  natureza: TSale['natureza']
  parceiro: TSale['parceiro']
  valor: TSale['valor']
  vendedor: TSale['vendedor']
}
type GetSalesParams = {
  collection: Collection<TSale>
  after: string
  before: string
}
async function getSales({ collection, after, before }: GetSalesParams) {
  try {
    const match: Filter<TSale> = { $and: [{ dataVenda: { $gte: after } }, { dataVenda: { $lte: before } }] }
    const projection = {
      cliente: 1,
      dataVenda: 1,
      natureza: 1,
      parceiro: 1,
      valor: 1,
      vendedor: 1,
    }
    const result = await collection.aggregate([{ $match: match }, { $project: projection }]).toArray()

    return result as TSaleResult[]
  } catch (error) {
    throw error
  }
}
