import { TClient } from '@/schemas/clients'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import axios from 'axios'
import dayjs from 'dayjs'
import { Collection, ObjectId } from 'mongodb'
import { NextApiRequest, NextApiResponse } from 'next'
import dayjsCustomFormatter from 'dayjs/plugin/customParseFormat'
dayjs.extend(dayjsCustomFormatter)

export default async function getResults(req: NextApiRequest, res: NextApiResponse) {
  const currentDateFormatted = dayjs().format('DD/MM/YYYY').replaceAll('/', '')
  const { data: onlineAPIResponse } = await axios.post('https://onlinesoftware.com.br/planodecontas/apirestweb/vends/listvends.php', {
    token: process.env.ONLINE_API_TOKEN,
    rotina: 'listarVendas001',
    dtinicio: currentDateFormatted,
    dtfim: currentDateFormatted,
  })
  const onlineResults = onlineAPIResponse.resultado

  const db = await connectToDatabase()
  const salesCollection = db.collection('sales')
  const salesItemsCollection = db.collection('sales-items')
  const clientsCollection: Collection<TClient> = db.collection('clients')

  const clients = await clientsCollection.find({}, { projection: { nome: 1 } }).toArray()

  var salesItems: any[] = []
  var clientsToInsert: any[] = []
  const allSales = onlineResults

  const allSalesFormatted = allSales.map((sale: any, index: number) => {
    const dateFormatted = dayjs(sale.data, 'DD/MM/YYYY').toISOString()
    const salesItemsFormatted = sale.itens.map((saleItem: any) => ({
      ...saleItem,
      qtde: Number(saleItem.qtde),
      valorunit: Number(saleItem.valorunit),
      vprod: Number(saleItem.vprod),
      vdesc: Number(saleItem.vdesc),
      vcusto: Number(saleItem.vcusto),
      baseicms: Number(saleItem.baseicms),
      percent: Number(saleItem.percent),
      icms: Number(saleItem.icms),
      vfrete: Number(saleItem.vfrete),
      vseg: Number(saleItem.vseg),
      voutro: Number(saleItem.voutro),
      vipi: Number(saleItem.vipi),
      vicmsst: Number(saleItem.vicmsst),
      vicms_desonera: Number(saleItem.vicms_desonera),
    }))
    const custoTotal = salesItemsFormatted.reduce((acc: number, current: any) => acc + current.vcusto, 0)
    salesItems = [...salesItems, ...salesItemsFormatted]

    const equivalentClient = clients.find((c) => c.nome == sale.cliente)
    if (!!equivalentClient) {
      return {
        ...sale,
        valor: Number(sale.valor),
        dataVenda: dateFormatted,
        idCliente: equivalentClient._id.toString(),
        itens: salesItemsFormatted,
        custoTotal,
      }
    } else {
      const clientObjectId = new ObjectId()
      clientsToInsert = [...clientsToInsert, { _id: clientObjectId, nome: sale.cliente }]
      return { ...sale, valor: Number(sale.valor), dataVenda: dateFormatted, idCliente: clientObjectId.toString(), itens: salesItemsFormatted, custoTotal }
    }
  })
  if (allSalesFormatted.length > 0) {
    const salesInsertResponse = await salesCollection.insertMany(allSalesFormatted)
    console.log(salesInsertResponse)
  }
  if (clientsToInsert.length > 0) {
    const clientsInsertResponse = await clientsCollection.insertMany(clientsToInsert)
    console.log(clientsInsertResponse)
  }
  return res.status(201).json('EXECUTADO COM SUCESSO')
}
