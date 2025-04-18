import { apiHandler } from '@/lib/api'
import { formatToPhone } from '@/lib/formatting'
import { TClient } from '@/schemas/clients'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { generateId } from 'lucia'
import { NextApiHandler } from 'next'

const handleExportClientsRoute: NextApiHandler<any> = async (req, res) => {
  const db = await connectToDatabase()
  const clientsCollection = db.collection<TClient>('clients')
  const salesCollection = db.collection('sales')

  const clientsWithSales = await clientsCollection.aggregate([
    {
      $addFields: {
        idAsString: { $toString: '$_id' }
      }
    },
    {
      $lookup: {
        from: 'sales',
        localField: 'idAsString',
        foreignField: 'idCliente',
        as: 'sales'
      }
    },
    {
      $project: {
        _id: 1,
        nome: 1,
        email: 1,
        telefone: 1,
        totalPurchases: { $size: '$sales' },
        totalSpent: { $sum: '$sales.valor' },
        avgTicket: {
          $cond: [
            { $eq: [{ $size: '$sales' }, 0] },
            0,
            { $divide: [{ $sum: '$sales.valor' }, { $size: '$sales' }] }
          ]
        }
      }
    }
  ]).toArray()

  const amazonFormatClients = clientsWithSales.map((client) => ({
    userId: generateId(10),
    properties: {
      userName: client.nome,
      userEmail: client.email || 'naoinformado@email.com',
      userPhone: client.telefone ? formatToPhone(client.telefone) : 'naoinformado',
      userAge: 99,
      userGender: 'NÃO DEFINIDO',
      totalPurchases: client.totalPurchases,
      totalSpent: client.totalSpent,
      avgTicket: client.avgTicket
    },
  }))

  return res.status(200).json(amazonFormatClients)
}

export default apiHandler({ GET: handleExportClientsRoute })
