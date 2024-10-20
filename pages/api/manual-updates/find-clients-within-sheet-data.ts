import { NextApiHandler } from 'next'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Collection, ObjectId } from 'mongodb'
import { TClient } from '@/schemas/clients'
import { apiHandler } from '@/lib/api'
import { formatToPhone } from '@/lib/formatting'
import SheetData from '../../../exportar-amperemais.json'
import { calculateStringSimilarity } from '@/lib/utils'

type TSheetDataItem = {
  'NOME CLIENTE': string
  ' TELEFONE': number | string
  'JA É CLIENTE?': string
  ENTRADA: string
  'NECESSIDADE DO CLIENTE': string
  '1º  CONTATO': string
  'PRÉ VENDEDOR': string
  'FINALIZOU ATENDIMENTO': string
  'COMPROU?': string
  'FOLLOW-UP': 'PARA FAZER'
}
const updateManualRoute: NextApiHandler<any> = async (req, res) => {
  //   const db = await connectToDatabase()
  //   const clientsCollection: Collection<TClient> = db.collection('clients')

  //   const clients = await clientsCollection.find({}).toArray()

  //   const bulkwrite = clients
  //     .map((client) => {
  //       const equivalent = (SheetData as TSheetDataItem[]).find((d) => {
  //         const sheetItemPhone = d[' TELEFONE'] ? formatToPhone(d[' TELEFONE'].toString()) : null
  //         if (!sheetItemPhone) return null
  //         return client.telefone == sheetItemPhone || calculateStringSimilarity(client.telefone || '', sheetItemPhone) > 90
  //       })

  //       if (!equivalent || !equivalent?.ENTRADA) return null
  //       return {
  //         updateOne: {
  //           filter: { _id: new ObjectId(client._id) },
  //           update: {
  //             $set: {
  //               canalAquisicao: equivalent?.ENTRADA,
  //             },
  //           },
  //         },
  //       }
  //     })
  //     .filter((d) => !!d)

  //   const bkResponse = await clientsCollection.bulkWrite(bulkwrite)
  //   console.log(bulkwrite.length)
  //   return res.json(bkResponse)

  return res.json('DESATIVADA')
}

export default apiHandler({ GET: updateManualRoute })
