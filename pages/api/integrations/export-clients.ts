import { apiHandler } from '@/lib/api'
import { formatToPhone } from '@/lib/formatting'
import { TClient } from '@/schemas/clients'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { generateId } from 'lucia'
import { NextApiHandler } from 'next'

const handleExportClientsRoute: NextApiHandler<any> = async (req, res) => {
  console.log('CHECK')
  const db = await connectToDatabase()
  const clientsCollection = db.collection<TClient>('clients')

  const clients = await clientsCollection.find({}).toArray()

  const amazonFormatClients = clients.map((client) => ({
    userId: generateId(10),
    properties: {
      userName: client.nome,
      userEmail: client.email || 'naoinformado@email.com',
      userPhone: client.telefone ? formatToPhone(client.telefone) : 'naoinformado',
      userAge: 99,
      userGender: 'NÃO DEFINIDO',
    },
  }))
  return res.status(200).json(amazonFormatClients)
}
export default apiHandler({ GET: handleExportClientsRoute })
