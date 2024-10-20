import { apiHandler } from '@/lib/api'
import { TClient } from '@/schemas/clients'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { Collection } from 'mongodb'
import { NextApiHandler } from 'next'

const updateManualRoute: NextApiHandler<any> = async (req, res) => {
  const db = await connectToDatabase()
  const clientsCollection: Collection<TClient> = db.collection('clients')

  const updateResponse = await clientsCollection.updateMany({}, { $unset: { idPrimeiraVenda: '' } })

  return res.json(updateResponse)
}
export default apiHandler({ GET: updateManualRoute })
