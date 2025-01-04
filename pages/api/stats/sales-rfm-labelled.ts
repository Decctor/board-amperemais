import connectToDatabase from '@/services/mongodb/main-db-connection'

import { NextApiHandler } from 'next'

import { getUserSession } from '@/lib/auth/session'
import { TClient } from '@/schemas/clients'
import { Collection } from 'mongodb'
import { apiHandler } from '@/lib/api'

export type TRFMLabelledStats = {
  rfmLabel: string
  backgroundCollor: string
  gridArea: string
  clientsQty: number
}[]
type GetResponse = {
  data: TRFMLabelledStats
}
const getSalesRFMLabelledRoute: NextApiHandler<GetResponse> = async (req, res) => {
  const session = await getUserSession({ request: req })
  const userSeller = session.vendedor

  const db = await connectToDatabase()
  const clientsCollection: Collection<TClient> = db.collection('clients')

  const allClients = await clientsCollection.find({}).toArray()

  const gridItems = [
    {
      rfmLabel: 'NÃO PODE PERDÊ-LOS',
      backgroundCollor: 'bg-blue-400',
      gridArea: '1 / 1 / 2 / 3',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'NÃO PODE PERDÊ-LOS').length || 0,
    },
    {
      rfmLabel: 'CLIENTES LEAIS',
      backgroundCollor: 'bg-green-400',
      gridArea: '1 / 3 / 3 / 6',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'CLIENTES LEAIS').length || 0,
    },
    {
      rfmLabel: 'CAMPEÕES',
      backgroundCollor: 'bg-orange-400',
      gridArea: '1 / 5 / 2 / 6',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'CAMPEÕES').length || 0,
    },
    {
      rfmLabel: 'EM RISCO',
      backgroundCollor: 'bg-yellow-400',
      gridArea: '2 / 1 / 4 / 3',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'EM RISCO').length || 0,
    },
    {
      rfmLabel: 'PRECISAM DE ATENÇÃO',
      backgroundCollor: 'bg-indigo-400',
      gridArea: '3 / 3 / 4 / 4',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'PRECISAM DE ATENÇÃO').length || 0,
    },
    {
      rfmLabel: 'POTENCIAIS CLIENTES LEAIS',
      backgroundCollor: 'bg-[#5C4033]',
      gridArea: '3 / 4 / 5 / 6',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'POTENCIAIS CLIENTES LEAIS').length || 0,
    },
    {
      rfmLabel: 'HIBERNANDO',
      backgroundCollor: 'bg-purple-400',
      gridArea: '4 / 2 / 5 / 3',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'HIBERNANDO').length || 0,
    },
    {
      rfmLabel: 'PRESTES A DORMIR',
      backgroundCollor: 'bg-yellow-600',
      gridArea: '4 / 3 / 6 / 4',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'PRESTES A DORMIR').length || 0,
    },
    {
      rfmLabel: 'PERDIDOS',
      backgroundCollor: 'bg-red-500',
      gridArea: '4 / 1 / 6 / 2',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'PERDIDOS').length || 0,
    },
    {
      rfmLabel: 'PERDIDOS (extensão)',
      backgroundCollor: 'bg-red-500',
      gridArea: '5 / 2 / 6 / 3',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'PERDIDOS (extensão)').length || 0,
    },
    {
      rfmLabel: 'PROMISSORES',
      backgroundCollor: 'bg-pink-400',
      gridArea: '5 / 4 / 6 / 5',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'PROMISSORES').length || 0,
    },
    {
      rfmLabel: 'CLIENTES RECENTES',
      backgroundCollor: 'bg-teal-400',
      gridArea: '5 / 5 / 6 / 6',
      clientsQty: allClients?.filter((x) => x.analiseRFM.titulo == 'CLIENTES RECENTES').length || 0,
    },
  ]

  return res.status(200).json({ data: gridItems })
}

export default apiHandler({ GET: getSalesRFMLabelledRoute })
