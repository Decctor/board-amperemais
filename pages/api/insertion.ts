import { NextApiHandler } from 'next'
import Results from '@/resultados.json'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Collection, ObjectId } from 'mongodb'
import { TClient } from '@/schemas/clients'
import dayjs from 'dayjs'
import { apiHandler } from '@/lib/api'
import dayjsCustomFormatter from 'dayjs/plugin/customParseFormat'

dayjs.extend(dayjsCustomFormatter)

const handleInsertion: NextApiHandler<any> = async (request, response) => {
  // const allSales = (Results as any).flat(1)

  // console.log('ALL SALES LENGTH', allSales.length)

  // const db = await connectToDatabase()
  // const salesCollection = db.collection('sales')
  // const productsCollection = db.collection('products')

  // const salesItems = await salesCollection
  //   .aggregate([
  //     {
  //       $unwind: {
  //         path: '$itens',
  //         includeArrayIndex: 'string',
  //         preserveNullAndEmptyArrays: false,
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: {
  //           codigo: '$itens.codigo',
  //           descricao: '$itens.descricao',
  //           unidade: '$itens.unidade',
  //           grupo: '$itens.grupo',
  //         },
  //       },
  //     },
  //   ])
  //   .toArray()

  // const products = salesItems.map((item) => ({
  //   codigo: item._id.codigo,
  //   nome: item._id.descricao,
  //   unidade: item._id.unidade,
  //   categoria: item._id.grupo,
  // }))
  // const insertManyProducts = await productsCollection.insertMany(products)

  // const salesItemsCollection = db.collection('sales-items')
  // const clientsCollection: Collection<TClient> = db.collection('clients')

  // const clients = await clientsCollection.find({}, { projection: { nome: 1 } }).toArray()

  // var salesItems: any[] = []
  // var clientsToInsert: any[] = []

  // const allSalesFormatted = allSales.map((sale: any, index: number) => {
  //   console.log('INDEX SALE', index)
  //   const dateFormatted = dayjs(sale.data, 'DD/MM/YYYY').toISOString()
  //   const salesItemsFormatted = sale.itens.map((saleItem: any) => ({
  //     ...saleItem,
  //     qtde: Number(saleItem.qtde),
  //     valorunit: Number(saleItem.valorunit),
  //     vprod: Number(saleItem.vprod),
  //     vdesc: Number(saleItem.vdesc),
  //     vcusto: Number(saleItem.vcusto),
  //     baseicms: Number(saleItem.baseicms),
  //     percent: Number(saleItem.percent),
  //     icms: Number(saleItem.icms),
  //     vfrete: Number(saleItem.vfrete),
  //     vseg: Number(saleItem.vseg),
  //     voutro: Number(saleItem.voutro),
  //     vipi: Number(saleItem.vipi),
  //     vicmsst: Number(saleItem.vicmsst),
  //     vicms_desonera: Number(saleItem.vicms_desonera),
  //   }))
  //   const custoTotal = salesItemsFormatted.reduce((acc, current) => acc + current.vcusto, 0)
  //   salesItems = [...salesItems, ...salesItemsFormatted]

  //   const equivalentClient = clients.find((c) => c.nome == sale.cliente)
  //   if (!!equivalentClient) {
  //     return {
  //       ...sale,
  //       valor: Number(sale.valor),
  //       dataVenda: dateFormatted,
  //       idCliente: equivalentClient._id.toString(),
  //       itens: salesItemsFormatted,
  //       custoTotal,
  //     }
  //   } else {
  //     const clientObjectId = new ObjectId()
  //     clientsToInsert = [...clientsToInsert, { _id: clientObjectId, nome: sale.cliente }]
  //     return { ...sale, valor: Number(sale.valor), dataVenda: dateFormatted, idCliente: clientObjectId.toString(), itens: salesItemsFormatted, custoTotal }
  //   }
  // })

  // const salesInsertResponse = await salesCollection.insertMany(allSalesFormatted)
  // const clientsInsertResponse = await clientsCollection.insertMany(clientsToInsert)

  return response.status(200).json('DESATIVADA')
}

export default apiHandler({ GET: handleInsertion })

//   const allSales = (Results as any).flat(1)

//   console.log('ALL SALES LENGTH', allSales.length)

//   const db = await connectToDatabase()
//   const salesCollection = db.collection('sales')
//   const salesItemsCollection = db.collection('sales-items')
//   const clientsCollection: Collection<TClient> = db.collection('clients')

//   const clients = await clientsCollection.find({}, { projection: { nome: 1 } }).toArray()

//   var salesItems: any[] = []
//   var clientsToInsert: any[] = []

//   const allSalesFormatted = allSales.map((sale: any, index: number) => {
//     console.log('INDEX SALE', index)
//     const saleObjectId = new ObjectId()
//     const dateFormatted = dayjs(sale.data, 'DD/MM/YYYY').toISOString()
//     const salesItemsFormatted = sale.itens.map((i: any) => ({ ...i, idVenda: saleObjectId.toString(), dataVenda: dateFormatted }))
//     salesItems = [...salesItems, ...salesItemsFormatted]

//     const equivalentClient = clients.find((c) => c.nome == sale.cliente)
//     if (!!equivalentClient) {
//       return { _id: saleObjectId, ...sale, valor: Number(sale.valor), dataVenda: dateFormatted, idCliente: equivalentClient._id.toString(), itens: undefined }
//     } else {
//       const clientObjectId = new ObjectId()
//       clientsToInsert = [...clientsToInsert, { _id: clientObjectId, nome: sale.cliente }]
//       return { _id: saleObjectId, ...sale, valor: Number(sale.valor), dataVenda: dateFormatted, idCliente: clientObjectId.toString(), itens: undefined }
//     }
//   })
//   const allSalesItemsFormatted = salesItems.map((saleItem) => ({
//     ...saleItem,
//     qtde: Number(saleItem.qtde),
//     valorunit: Number(saleItem.valorunit),
//     vprod: Number(saleItem.vprod),
//     vdesc: Number(saleItem.vdesc),
//     vcusto: Number(saleItem.vcusto),
//     baseicms: Number(saleItem.baseicms),
//     percent: Number(saleItem.percent),
//     icms: Number(saleItem.icms),
//     vfrete: Number(saleItem.vfrete),
//     vseg: Number(saleItem.vseg),
//     voutro: Number(saleItem.voutro),
//     vipi: Number(saleItem.vipi),
//     vicmsst: Number(saleItem.vicmsst),
//     vicms_desonera: Number(saleItem.vicms_desonera),
//   }))

//   const salesInsertResponse = await salesCollection.insertMany(allSalesFormatted)
//   const salesItemsInsertResponse = await salesItemsCollection.insertMany(allSalesItemsFormatted)
//   const clientsInsertResponse = await clientsCollection.insertMany(clientsToInsert)
