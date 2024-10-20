import { apiHandler } from '@/lib/api'
import { TSale } from '@/schemas/sales'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import dayjs from 'dayjs'
import { Collection, Filter, ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'
import dayjsCustomFormatter from 'dayjs/plugin/customParseFormat'
import { TClient } from '@/schemas/clients'
import { TSaleItem } from '@/schemas/sales-items'
import { TRFMConfig } from '@/utils/rfm'

const intervalStart = dayjs().subtract(12, 'month').startOf('day').toISOString()
const intervalEnd = dayjs().endOf('day').toISOString()

dayjs.extend(dayjsCustomFormatter)
const updateManualRoute: NextApiHandler<any> = async (req, res) => {
  //   const db = await connectToDatabase()
  //   const clientsCollection: Collection<TClient> = db.collection('clients')
  //   const salesCollection: Collection<TSale> = db.collection('sales')
  //   const utilsCollection: Collection<TRFMConfig> = db.collection('utils')

  //   const allSales = await salesCollection.find({}, { projection: { dataVenda: 1, idCliente: 1 } }).toArray()

  //   const allClients = await clientsCollection.find({}).toArray()

  //   const clientsBulkwrite = allClients.map((client) => {
  //     const orderedSales = allSales
  //       .filter((s) => s.idCliente == client._id.toString())
  //       .sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime())
  //     const lastSale = orderedSales[0]
  //     const firstSale = orderedSales[orderedSales.length - 1]

  //     return {
  //       updateOne: {
  //         filter: { _id: new ObjectId(client._id) },
  //         update: {
  //           $set: {
  //             idPrimeiraCompra: firstSale?._id.toString(),
  //           },
  //         },
  //       },
  //     }
  //     // return { cliente: client.nome, lastSale, firstSale }
  //   })
  //   const bkResponse = await clientsCollection.bulkWrite(clientsBulkwrite)
  //   return res.status(200).json(bkResponse)
  return res.status(200).json('DESATIVADA')
}

export default apiHandler({ GET: updateManualRoute })

//   const db = await connectToDatabase()
//   const clientsCollection: Collection<TClient> = db.collection('clients')
//   const salesCollection: Collection<TSale> = db.collection('sales')
//   const utilsCollection: Collection<TRFMConfig> = db.collection('utils')

//   const allClients = await clientsCollection.find({}).toArray()

//   const match: Filter<TSale> = { $and: [{ dataVenda: { $gte: intervalStart } }, { dataVenda: { $lte: intervalEnd } }] }

//   const project = { idCliente: 1, valor: 1, dataVenda: 1 }
//   const sales = (await salesCollection.aggregate([{ $match: match }, { $project: project }]).toArray()) as TSaleResult[]

//   const rfmConfig = (await utilsCollection.findOne({ identificador: 'CONFIG_RFM' })) as TRFMConfig

//   const bulkWriteArr = allClients.map((client) => {
//     const calculatedRecency = calculateRecency(client._id.toString(), sales)
//     const calculatedFrequency = calculateFrequency(client._id.toString(), sales) || 0

//     const recency = calculatedRecency == Infinity ? null : calculatedRecency
//     const frequency = calculatedFrequency || 0

//     const configRecency = Object.entries(rfmConfig.recencia).find(([key, value]) => recency && recency >= value.min && recency <= value.max)
//     const recencyScore = configRecency ? Number(configRecency[0]) : 1

//     const configFrequency = Object.entries(rfmConfig.frequencia).find(([key, value]) => frequency >= value.min && frequency <= value.max)
//     const frequencyScore = configFrequency ? Number(configFrequency[0]) : 1

//     const monetary = calculateMonetaryValue(client._id.toString(), sales)

//     const label = getRFMLabel(frequencyScore, recencyScore)

//     return {
//       updateOne: {
//         filter: { _id: new ObjectId(client._id) },
//         update: {
//           $set: {
//             analiseRFM: {
//               notas: { recencia: recencyScore, frequencia: frequencyScore },
//               titulo: label,
//             },
//             analisePeriodo: {
//               recencia: recency,
//               frequencia: frequency,
//               valor: monetary,
//             },
//           },
//         },
//       },
//     }
//   })
//   const bulkWriteResponse = await clientsCollection.bulkWrite(bulkWriteArr)
//   return res.json(bulkWriteResponse)

// type TSaleResult = {
//   valor: TSale['valor']
//   dataVenda: TSale['dataVenda']
//   idCliente: TSale['idCliente']
// }
// const calculateRecency = (clientId: string, sales: TSaleResult[]) => {
//   const clientSales = sales.filter((sale) => sale.idCliente === clientId)
//   const lastSale = clientSales.sort((a, b) => {
//     return new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()
//   })[0]
//   if (!lastSale) return null
//   const lastSaleDate = new Date(lastSale.dataVenda)

//   const recency = dayjs().diff(dayjs(lastSaleDate), 'days')
//   return recency
// }
// const calculateFrequency = (clientId: string, sales: TSaleResult[]) => {
//   return sales.filter((sale) => sale.idCliente === clientId).length
// }
// const calculateMonetaryValue = (clientId: string, sales: TSaleResult[]) => {
//   return sales.filter((sale) => sale.idCliente === clientId).reduce((total, sale) => total + sale.valor, 0)
// }
// const RFMLabels = [
//   {
//     text: 'NÃO PODE PERDÊ-LOS',
//     combinations: [
//       [5, 1],
//       [5, 2],
//     ],
//   },
//   {
//     text: 'CLIENTES LEAIS',
//     combinations: [
//       [5, 3],
//       [5, 4],
//       [4, 3],
//       [4, 4],
//       [4, 5],
//     ],
//   },
//   {
//     text: 'CAMPEÕES',
//     combinations: [[5, 5]],
//   },
//   {
//     text: 'EM RISCO',
//     combinations: [
//       [4, 1],
//       [4, 2],
//       [3, 1],
//       [3, 2],
//     ],
//   },
//   {
//     text: 'PRECISAM DE ATENÇÃO',
//     combinations: [[3, 3]],
//   },
//   {
//     text: 'POTENCIAIS CLIENTES LEAIS',
//     combinations: [
//       [3, 4],
//       [3, 5],
//       [2, 4],
//       [2, 5],
//     ],
//   },
//   {
//     text: 'HIBERNANDO',
//     combinations: [[2, 2]],
//   },
//   {
//     text: 'PRESTES A DORMIR',
//     combinations: [
//       [2, 3],
//       [1, 3],
//     ],
//   },
//   {
//     text: 'PERDIDOS',
//     combinations: [
//       [2, 1],
//       [1, 1],
//       [1, 2],
//     ],
//   },
//   {
//     text: 'PROMISSORES',
//     combinations: [[1, 4]],
//   },
//   { text: 'CLIENTES RECENTES', combinations: [[1, 5]] },
// ]
// const getRFMLabel = (frequency: number, recency: number) => {
//   const label = RFMLabels.find((l) => l.combinations.some((c) => c[0] == frequency && c[1] == recency))

//   return label?.text || 'PERDIDOS'
// }
