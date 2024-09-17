import { apiHandler } from '@/lib/api'
import { TSale } from '@/schemas/sales'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import dayjs from 'dayjs'
import { Collection, ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'
import dayjsCustomFormatter from 'dayjs/plugin/customParseFormat'
import { TClient } from '@/schemas/clients'
import { TSaleItem } from '@/schemas/sales-items'

dayjs.extend(dayjsCustomFormatter)
const updateManualRoute: NextApiHandler<any> = async (req, res) => {
  return res.json('DESATIVADA')
}

export default apiHandler({ GET: updateManualRoute })

// const db = await connectToDatabase()
// const salesCollection: Collection<TSale> = db.collection('sales')
// const salesItemsCollection = db.collection('sales-items')
// const allSales = await salesCollection.find({}, { projection: { data: 1, dataVenda: 1 } }).toArray()
// const allSalesItems = await salesItemsCollection.find({}, { projection: { idVenda: 1 } }).toArray()
// //   const allSalesBulkwrite = allSales.map((sale) => {
// //     const dateFormatted = dayjs(sale.data, "DD/MM/YYYY").toISOString();
// //     return {
// //       updateOne: {
// //         filter: { _id: new ObjectId(sale._id) },
// //         update: {
// //           $set: {
// //             dataVenda: dateFormatted,
// //           },
// //         },
// //       },
// //     };
// //   });
// const allSalesItemsBulkwrite = allSalesItems.map((saleItem, index) => {
//   const equivalentSale = allSales.find((s) => s._id.toString() == saleItem.idVenda)
//   console.log(index)
//   return {
//     updateOne: {
//       filter: { _id: new ObjectId(saleItem._id) },
//       update: {
//         $set: {
//           dataVenda: equivalentSale?.dataVenda,
//         },
//       },
//     },
//   }
// })
// //   const bulkWriteResponse = await salesCollection.bulkWrite(allSalesBulkwrite);
// const bulkWriteResponse = await salesItemsCollection.bulkWrite(allSalesItemsBulkwrite)
