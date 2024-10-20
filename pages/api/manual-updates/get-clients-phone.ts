import { NextApiHandler } from 'next'
import ResultsJSON from '../../../resultados.json'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Collection, ObjectId } from 'mongodb'
import { TClient } from '@/schemas/clients'
import { apiHandler } from '@/lib/api'
import { formatToPhone } from '@/lib/formatting'

const updateManualRoute: NextApiHandler<any> = async (req, res) => {
  //   const resultsSales = (ResultsJSON as any[]).flat(1)
  //   const db = await connectToDatabase()
  //   const clientsCollection: Collection<TClient> = db.collection('clients')

  //   const clients = await clientsCollection.find({}).toArray()

  //   const bulkwrite = clients.map((client) => {
  //     const clientInfoWithPhone = resultsSales.find((r) => r.cliente == client.nome && !!r.clientefone)

  //     return {
  //       updateOne: {
  //         filter: { _id: new ObjectId(client._id) },
  //         update: {
  //           $set: {
  //             telefone: clientInfoWithPhone?.clientefone ? formatToPhone(clientInfoWithPhone.clientefone) : null,
  //           },
  //         },
  //       },
  //     }
  //   })

  //   const bkResponse = await clientsCollection.bulkWrite(bulkwrite)
  //   return res.json(bkResponse)
  return res.json('DESATIVADA')
}

export default apiHandler({ GET: updateManualRoute })
