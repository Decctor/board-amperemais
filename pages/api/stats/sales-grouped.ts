import { apiHandler } from '@/lib/api'
import { getUserSession } from '@/lib/auth/session'
import { TClient } from '@/schemas/clients'
import { SalesGeneralStatsFiltersSchema, TSaleStatsGeneralQueryParams } from '@/schemas/query-params-utils'
import { TSaleGoal } from '@/schemas/sale-goals'
import { TSale } from '@/schemas/sales'
import { TSaleItem } from '@/schemas/sales-items'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import dayjs from 'dayjs'
import { Collection, Filter, ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'

type TGroupedSalesStatsReduced = {
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

export type TGroupedSalesStats = {
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

type GetResponse = {
  data: TGroupedSalesStats
}
const getSalesGroupedStatsRoute: NextApiHandler<GetResponse> = async (req, res) => {
  const user = await getUserSession({ request: req })
  const filters = SalesGeneralStatsFiltersSchema.parse(req.body)

  const db = await connectToDatabase()
  const salesCollection: Collection<TSale> = db.collection('sales')

  const sales = await getSales({ collection: salesCollection, filters })

  const stats = sales.reduce(
    (acc: TGroupedSalesStatsReduced, current) => {
      let totalFiltered = 0
      // Handling stats by items
      current.itens
        .filter((item) => (filters.productGroups.length > 0 ? filters.productGroups.includes(item.grupo) : true))
        .forEach((item) => {
          if (!acc.porGrupo[item.grupo]) acc.porGrupo[item.grupo] = { qtde: 0, total: 0 }
          if (!acc.porItem[item.descricao]) acc.porItem[item.descricao] = { qtde: 0, total: 0 }
          // Updating stats by group
          acc.porGrupo[item.grupo].qtde += 1
          acc.porGrupo[item.grupo].total += item.vprod - item.vdesc

          acc.porItem[item.descricao].qtde += 1
          acc.porItem[item.descricao].total += item.vprod - item.vdesc

          totalFiltered += item.vprod - item.vdesc
        })

      //  Updating stats by seller
      if (!acc.porVendedor[current.vendedor]) acc.porVendedor[current.vendedor] = { qtde: 0, total: 0 }
      acc.porVendedor[current.vendedor].qtde += 1
      acc.porVendedor[current.vendedor].total += totalFiltered

      return acc
    },
    {
      porGrupo: {},
      porVendedor: {},
      porItem: {},
    } as TGroupedSalesStatsReduced
  )

  const groupedStats: TGroupedSalesStats = {
    porItem: Object.entries(stats.porItem)
      .map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
      .sort((a, b) => b.total - a.total),
    porGrupo: Object.entries(stats.porGrupo)
      .map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
      .sort((a, b) => b.total - a.total),
    porVendedor: Object.entries(stats.porVendedor)
      .map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
      .sort((a, b) => b.total - a.total),
  }

  return res.status(200).json({ data: groupedStats })
}

export default apiHandler({ POST: getSalesGroupedStatsRoute })

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
