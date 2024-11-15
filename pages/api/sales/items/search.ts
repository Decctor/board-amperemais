import { apiHandler } from '@/lib/api'
import { TSaleItem, TSaleItemSimplifiedDTO } from '@/schemas/sales-items'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Filter } from 'mongodb'
import { NextApiHandler } from 'next'
import { z } from 'zod'

const ItemsSearchSchema = z.object({
  page: z.number({ required_error: 'Parâmetro de paginação não informado.' }).default(1),
  searchDescription: z.string({ required_error: 'Parâmetro de busca não informado.', invalid_type_error: 'Tipo não válido para busca por descrição.' }),
  searchCode: z.string({ required_error: 'Parâmetro de busca por código não informado.', invalid_type_error: 'Tipo não válido para busca por código.' }),
})
export type TItemsSearchQueryParams = z.infer<typeof ItemsSearchSchema>

export type TSaleItemsBySearch = {
  items: TSaleItemSimplifiedDTO[]
  itemsMatched: number
  totalPages: number
}

type PostResponse = {
  data: TSaleItemsBySearch
}
const getSaleItemsSearchRoute: NextApiHandler<PostResponse> = async (req, res) => {
  const PAGE_SIZE = 250
  const { searchDescription, searchCode, page } = ItemsSearchSchema.parse(req.body)

  const searchFiltersArray: Filter<TSaleItemSimplifiedDTO>[] = []
  if (searchDescription.trim().length > 0) {
    searchFiltersArray.push({ $or: [{ descricao: { $regex: searchDescription, $options: 'i' } }, { descricao: searchDescription }] })
  }
  if (searchCode.trim().length > 0) {
    searchFiltersArray.push({ $or: [{ codigo: { $regex: searchCode, $options: 'i' } }, { codigo: searchCode }] })
  }
  const filters = searchFiltersArray.length > 0 ? { $and: searchFiltersArray } : {}

  const skip = PAGE_SIZE * (page - 1)
  const limit = PAGE_SIZE

  const db = await connectToDatabase()
  const collection = db.collection<TSaleItem>('sales')

  const itemsMatchedResult = await collection
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
        $match: filters,
      },
      {
        $count: 'itemsMatched',
      },
    ])
    .toArray()
  const itemsMatched = itemsMatchedResult[0].itemsMatched || 0
  const totalPages = Math.ceil(itemsMatched / PAGE_SIZE)

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
        $match: filters,
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ])
    .toArray()

  return res.status(200).json({ data: { items: items as TSaleItemSimplifiedDTO[], itemsMatched, totalPages } })
}

export default apiHandler({ POST: getSaleItemsSearchRoute })
