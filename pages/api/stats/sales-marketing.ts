import { apiHandler } from '@/lib/api'
import { TClient } from '@/schemas/clients'
import { TMarketingControl } from '@/schemas/marketing-controls'
import { SalesMarketingStatsFiltersSchema } from '@/schemas/query-params-utils'
import { TSale } from '@/schemas/sales'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import dayjs from 'dayjs'
import { Collection, Filter } from 'mongodb'
import { NextApiHandler } from 'next'
import { z } from 'zod'

type TSalesMarketingReduced = {
  valorInvestidoTotal: number
  valorVendidoTotal: number
  qtdeVendasTotal: number
  valorVendidoPrimeirasVendas: number
  qtdeVendasPrimeirasVendas: number
  valorVendidoRetencao: number
  qtdeVendasRetencao: number
  porControle: {
    [key: string]: {
      canaisAquisicao: string[]
      valorInvestido: number
      valorVendidoPrimeirasVendas: number
      qtdeVendasPrimeirasVendas: number
    }
  }
}

export type TSalesMarketingResult = {
  valorInvestidoTotal: number
  valorVendidoTotal: number
  qtdeVendasTotal: number
  valorVendidoPrimeirasVendas: number
  qtdeVendasPrimeirasVendas: number
  valorVendidoRetencao: number
  qtdeVendasRetencao: number
  porControle: {
    controle: string
    canaisAquisicao: string[]
    valorInvestido: number
    valorVendidoPrimeirasVendas: number
    qtdeVendasPrimeirasVendas: number
  }[]
}

const getSalesMarketingResultRoute: NextApiHandler<{ data: TSalesMarketingResult }> = async (req, res) => {
  const { period } = SalesMarketingStatsFiltersSchema.parse(req.body)

  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')
  const clientsCollection: Collection<TClient> = db.collection('clients')
  const marketingControlsCollection: Collection<TMarketingControl> = db.collection('marketing-controls')

  const ajustedAfter = period.after
  const ajustedBefore = dayjs(period.before).endOf('day').toISOString()

  const sales = await getSales({ collection: salesCollection, after: ajustedAfter, before: ajustedBefore })
  const clients = await getClients({ collection: clientsCollection, after: ajustedAfter, before: ajustedBefore })

  const controlsData = await getMarketingControlsData({ collection: marketingControlsCollection, after: ajustedAfter, before: ajustedBefore })

  const reduced = sales.reduce(
    (acc: TSalesMarketingReduced, current) => {
      const client = clients.find((c) => c.id == current.idCliente)

      const acquisitionChannel = client?.canalAquisicao

      // updating overall metrics
      acc.valorVendidoTotal += current.valor
      acc.qtdeVendasTotal += 1

      // Checking if its first purchase
      const isFirstPurchase = client?.idPrimeiraCompra == current.id

      if (isFirstPurchase) {
        acc.valorVendidoPrimeirasVendas += current.valor
        acc.qtdeVendasPrimeirasVendas += 1
        if (acquisitionChannel) {
          const sources = Object.entries(acc.porControle)
            .filter(([key, value]) => value.canaisAquisicao.includes(acquisitionChannel))
            .map(([key]) => key)

          sources.forEach((source) => {
            acc.porControle[source].valorVendidoPrimeirasVendas += current.valor
            acc.porControle[source].qtdeVendasPrimeirasVendas += 1
          })
        }
      } else {
        acc.valorVendidoRetencao += current.valor
        acc.qtdeVendasRetencao += 1
      }
      return acc
    },
    {
      valorInvestidoTotal: 0,
      valorVendidoTotal: 0,
      qtdeVendasTotal: 0,
      valorVendidoPrimeirasVendas: 0,
      qtdeVendasPrimeirasVendas: 0,
      valorVendidoRetencao: 0,
      qtdeVendasRetencao: 0,
      porControle: controlsData,
    }
  )

  const results: TSalesMarketingResult = {
    valorInvestidoTotal: Object.values(reduced.porControle).reduce((acc, current) => current.valorInvestido + acc, 0),
    valorVendidoTotal: reduced.valorVendidoTotal,
    qtdeVendasTotal: reduced.qtdeVendasTotal,
    valorVendidoPrimeirasVendas: reduced.valorVendidoPrimeirasVendas,
    qtdeVendasPrimeirasVendas: reduced.qtdeVendasPrimeirasVendas,
    valorVendidoRetencao: reduced.valorVendidoRetencao,
    qtdeVendasRetencao: reduced.qtdeVendasRetencao,
    porControle: Object.entries(reduced.porControle).map(([key, value]) => ({
      controle: key,
      ...value,
    })),
  }
  return res.status(200).json({ data: results })
}
export default apiHandler({ POST: getSalesMarketingResultRoute })
type TGetSalesResult = {
  id: string
  idCliente: TSale['idCliente']
  valor: TSale['valor']
  dataVenda: TSale['dataVenda']
}
type GetSalesParams = {
  collection: Collection<TSale>
  after: string
  before: string
}
async function getSales({ collection, after, before }: GetSalesParams): Promise<TGetSalesResult[]> {
  try {
    const sales = await collection
      .find(
        {
          $and: [{ dataVenda: { $gte: after } }, { dataVenda: { $lte: before } }],
        },
        {
          projection: {
            idCliente: 1,
            dataVenda: 1,
            valor: 1,
          },
        }
      )
      .toArray()
    return sales.map((s) => ({ id: s._id.toString(), valor: s.valor, dataVenda: s.dataVenda, idCliente: s.idCliente }))
  } catch (error) {
    throw error
  }
}

type TGetClientsResult = {
  id: string
  dataInsercao: TClient['dataInsercao']
  idPrimeiraCompra: TClient['idPrimeiraCompra']
  dataPrimeiraCompra: TClient['dataPrimeiraCompra']
  canalAquisicao: TClient['canalAquisicao']
}
type GetClientsParams = {
  collection: Collection<TClient>
  after: string
  before: string
}
async function getClients({ collection, after, before }: GetClientsParams): Promise<TGetClientsResult[]> {
  try {
    const match: Filter<TClient> = {
      $or: [{ dataInsercao: { $gte: after, $lte: before } }, { dataPrimeiraCompra: { $gte: after, $lte: before } }],
    }
    const clients = await collection
      .find({ ...match }, { projection: { dataInsercao: 1, dataPrimeiraCompra: 1, idPrimeiraCompra: 1, canalAquisicao: 1 } })
      .toArray()
    return clients.map((c) => ({
      id: c._id.toString(),
      dataInsercao: c.dataInsercao,
      dataPrimeiraCompra: c.dataPrimeiraCompra,
      idPrimeiraCompra: c.idPrimeiraCompra,
      canalAquisicao: c.canalAquisicao,
    }))
  } catch (error) {
    throw error
  }
}

type GetMarketingControlsDataParams = {
  collection: Collection<TMarketingControl>
  after: string
  before: string
}
async function getMarketingControlsData({ collection, after, before }: GetMarketingControlsDataParams) {
  try {
    const marketingControls = await collection.find({ $or: [{ inicio: { $lte: after } }, { fim: { $gte: before } }] }).toArray()
    const byControl = marketingControls.reduce((acc: TSalesMarketingReduced['porControle'], current) => {
      if (!acc[current.titulo])
        acc[current.titulo] = { valorInvestido: 0, valorVendidoPrimeirasVendas: 0, qtdeVendasPrimeirasVendas: 0, canaisAquisicao: current.canaisAquisicao }
      const investiment = Object.values(current.meses).reduce((acc, monthCurrent) => {
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
          return (acc += monthCurrent.investimento)
        } else {
          if (beforeDatetime > monthEndDatetime) {
            const applicableDays = dayjs(monthCurrent.fim).diff(dayjs(after), 'days')

            return acc + (monthCurrent.investimento * applicableDays) / monthCurrent.dias
          } else {
            const applicableDays = dayjs(before).diff(dayjs(monthCurrent.inicio), 'days')

            return acc + (monthCurrent.investimento * applicableDays) / monthCurrent.dias
          }
          return acc
        }
        return acc
      }, 0)
      acc[current.titulo].valorInvestido += investiment
      return acc
    }, {})

    return byControl
  } catch (error) {
    throw error
  }
}
