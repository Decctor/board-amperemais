import { apiHandler } from '@/lib/api'
import { TClient } from '@/schemas/clients'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import axios from 'axios'
import dayjs from 'dayjs'
import { Collection, ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'
import dayjsCustomFormatter from 'dayjs/plugin/customParseFormat'
dayjs.extend(dayjsCustomFormatter)

const getExport: NextApiHandler<any> = async (req, res) => {
  // const { data: onlineAPIResponse } = await axios.post('https://onlinesoftware.com.br/planodecontas/apirestweb/vends/listvends.php', {
  //   token: '0097d9f20753f2e606a36c45693562b2',
  //   rotina: 'listarVendas001',
  //   dtinicio: '23082024',
  //   dtfim: '16092024',
  // })
  // const onlineResults = onlineAPIResponse.resultado

  // const db = await connectToDatabase()
  // const salesCollection = db.collection('sales')
  // const salesItemsCollection = db.collection('sales-items')
  // const clientsCollection: Collection<TClient> = db.collection('clients')

  // const clients = await clientsCollection.find({}, { projection: { nome: 1 } }).toArray()

  // var salesItems: any[] = []
  // var clientsToInsert: any[] = []
  // const allSales = onlineResults

  // const allSalesFormatted = allSales.map((sale: any) => {
  //   const saleObjectId = new ObjectId()
  //   const dateFormatted = dayjs(sale.data, 'DD/MM/YYYY').toISOString()
  //   const salesItemsFormatted = sale.itens.map((i: any) => ({ ...i, idVenda: saleObjectId.toString(), dataVenda: dateFormatted }))
  //   salesItems = [...salesItems, ...salesItemsFormatted]

  //   const equivalentClient = clients.find((c) => c.nome == sale.cliente)
  //   if (!!equivalentClient) {
  //     return { _id: saleObjectId, ...sale, valor: Number(sale.valor), dataVenda: dateFormatted, idCliente: equivalentClient._id.toString(), itens: undefined }
  //   } else {
  //     const clientObjectId = new ObjectId()
  //     clientsToInsert = [...clientsToInsert, { _id: clientObjectId, nome: sale.cliente }]
  //     return { _id: saleObjectId, ...sale, valor: Number(sale.valor), dataVenda: dateFormatted, idCliente: clientObjectId.toString(), itens: undefined }
  //   }
  // })
  // const allSalesItemsFormatted = salesItems.map((saleItem) => ({
  //   ...saleItem,
  //   qtde: Number(saleItem.qtde),
  //   valorunit: Number(saleItem.valorunit),
  //   vprod: Number(saleItem.vprod),
  //   vdesc: Number(saleItem.vdesc),
  //   vcusto: Number(saleItem.vcusto),
  //   baseicms: Number(saleItem.baseicms),
  //   percent: Number(saleItem.percent),
  //   icms: Number(saleItem.icms),
  //   vfrete: Number(saleItem.vfrete),
  //   vseg: Number(saleItem.vseg),
  //   voutro: Number(saleItem.voutro),
  //   vipi: Number(saleItem.vipi),
  //   vicmsst: Number(saleItem.vicmsst),
  //   vicms_desonera: Number(saleItem.vicms_desonera),
  // }))

  // const salesInsertResponse = await salesCollection.insertMany(allSalesFormatted)
  // const salesItemsInsertResponse = await salesItemsCollection.insertMany(allSalesItemsFormatted)
  // const clientsInsertResponse = await clientsCollection.insertMany(clientsToInsert)
  return res.json('DESATIVADA')
}

export default apiHandler({ GET: getExport })
