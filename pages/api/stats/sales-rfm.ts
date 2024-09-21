import { apiHandler } from '@/lib/api'
import { TClient } from '@/schemas/clients'
import { TSale } from '@/schemas/sales'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { TRFMConfig } from '@/utils/rfm'
import dayjs from 'dayjs'
import { Collection, WithId } from 'mongodb'
import { NextApiHandler } from 'next'

export type TRFMResult = {
  clientName: string
  clientId: string
  recency: number
  frequency: number
  rfmScore: {
    recency: number
    frequency: number
  }
  RFMLabel: string
}[]
const intervalStart = dayjs().subtract(12, 'month').startOf('day').toISOString()
const intervalEnd = dayjs().endOf('day').toISOString()

const getSalesRFM: NextApiHandler<{ data: TRFMResult }> = async (req, res) => {
  const db = await connectToDatabase()
  const clientsCollection: Collection<TClient> = db.collection('clients')
  const salesCollection: Collection<TSale> = db.collection('sales')
  const utilsCollection: Collection<TRFMConfig> = db.collection('utils')

  const allClients = await clientsCollection.find({}).toArray()
  const sales = await getSales({ collection: salesCollection, after: intervalStart, before: intervalEnd })
  const rfmConfig = (await utilsCollection.findOne({ identificador: 'CONFIG_RFM' })) as TRFMConfig

  const rfm = categorizeRFM(allClients, sales, rfmConfig)
  return res.status(200).json({ data: rfm })
}

export default apiHandler({ GET: getSalesRFM })
type GetSalesParams = {
  collection: Collection<TSale>
  after: string
  before: string
}

type TSaleResult = {
  valor: TSale['valor']
  dataVenda: TSale['dataVenda']
  idCliente: TSale['idCliente']
}
async function getSales({ collection, after, before }: GetSalesParams) {
  try {
    const match = {
      dataVenda: { $gte: after, $lte: before },
    }
    const project = { idCliente: 1, valor: 1, dataVenda: 1 }
    const result = await collection.aggregate([{ $match: match }, { $project: project }]).toArray()
    return result as TSaleResult[]
  } catch (error) {
    throw error
  }
}

const calculateRecency = (clientId: string, sales: TSaleResult[]) => {
  const clientSales = sales.filter((sale) => sale.idCliente === clientId)
  const lastSale = clientSales.sort((a, b) => {
    return new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()
  })[0]
  if (!lastSale) return 999999
  const lastSaleDate = new Date(lastSale.dataVenda)

  const recency = dayjs().diff(dayjs(lastSaleDate), 'days')
  return recency
}
const calculateFrequency = (clientId: string, sales: TSaleResult[]) => {
  return sales.filter((sale) => sale.idCliente === clientId).length
}
const calculateMonetaryValue = (clientId: string, sales: TSaleResult[]) => {
  return sales.filter((sale) => sale.idCliente === clientId).reduce((total, sale) => total + sale.valor, 0)
}

const categorizeRFM = (clients: WithId<TClient>[], sales: TSaleResult[], config: TRFMConfig) => {
  return clients.map((client) => {
    const calculatedRecency = calculateRecency(client._id.toString(), sales)
    const calculatedFrequency = calculateFrequency(client._id.toString(), sales) || 0

    const recency = calculatedRecency == Infinity ? 999999 : calculatedRecency
    const frequency = calculatedFrequency || 0

    const configRecency = Object.entries(config.recencia).find(([key, value]) => recency >= value.min && recency <= value.max)
    const recencyScore = configRecency ? Number(configRecency[0]) : 1

    const configFrequency = Object.entries(config.frequencia).find(([key, value]) => frequency >= value.min && frequency <= value.max)
    const frequencyScore = configFrequency ? Number(configFrequency[0]) : 1

    const label = getRFMLabel(frequencyScore, recencyScore)
    return {
      clientName: client.nome,
      clientId: client._id.toString(),
      recency,
      frequency,
      rfmScore: { recency: recencyScore, frequency: frequencyScore },
      RFMLabel: label,
    }
  })
}

// Função para normalizar os scores de Recência, Frequência e Monetário em uma escala de 1 a 5
const normalizeRFM = (value: number, min: number, max: number, isRecency: boolean = false) => {
  // Para recência, queremos que o menor valor tenha o maior score, por isso invertemos a escala
  if (isRecency) {
    return Math.ceil(((max - value) / (max - min)) * 4 + 1)
  } else {
    // Para frequência e monetário, queremos que o maior valor tenha o maior score
    return Math.ceil(((value - min) / (max - min)) * 4 + 1)
  }
}

const calculateRFMScore = (
  clientsRFM: {
    clientName: string
    clientId: string
    recency: number
    frequency: number
    monetary: number
    rfmScore: { recency: number; frequency: number; monetary: number }
  }[]
) => {
  // Obter o valor mínimo e máximo de recência, frequência e monetário
  const recencyValues = clientsRFM.map((client) => client.recency)
  const frequencyValues = clientsRFM.map((client) => client.frequency)
  const monetaryValues = clientsRFM.map((client) => client.monetary)

  const minRecency = Math.min(...recencyValues)
  const maxRecency = Math.max(...recencyValues)
  console.log('RECENCIA', maxRecency, minRecency)
  const minFrequency = Math.min(...frequencyValues)
  const maxFrequency = Math.max(...frequencyValues)
  console.log('FREQUENCIA', maxFrequency, minFrequency)
  const minMonetary = Math.min(...monetaryValues)
  const maxMonetary = Math.max(...monetaryValues)
  console.log('MONETARIO', maxMonetary, minMonetary)
  // Calcular os scores normalizados para cada cliente
  return clientsRFM.map((client) => {
    const recencyScore = normalizeRFM(client.recency, minRecency, maxRecency, true)
    const frequencyScore = normalizeRFM(client.frequency, minFrequency, maxFrequency)
    const monetaryScore = normalizeRFM(client.monetary, minMonetary, maxMonetary)

    return {
      clientId: client.clientId,
      clientName: client.clientName,
      recencyScore,
      frequencyScore,
      monetaryScore,
      RFMLabel: getRFMLabel(frequencyScore, recencyScore),
    }
  })
}

const RFMLabels = [
  {
    text: 'NÃO PODE PERDÊ-LOS',
    combinations: [
      [5, 1],
      [5, 2],
    ],
  },
  {
    text: 'CLIENTES LEAIS',
    combinations: [
      [5, 3],
      [5, 4],
      [4, 3],
      [4, 4],
      [4, 5],
    ],
  },
  {
    text: 'CAMPEÕES',
    combinations: [[5, 5]],
  },
  {
    text: 'EM RISCO',
    combinations: [
      [4, 1],
      [4, 2],
      [3, 1],
      [3, 2],
    ],
  },
  {
    text: 'PRECISAM DE ATENÇÃO',
    combinations: [[3, 3]],
  },
  {
    text: 'POTENCIAIS CLIENTES LEAIS',
    combinations: [
      [3, 4],
      [3, 5],
      [2, 4],
      [2, 5],
    ],
  },
  {
    text: 'HIBERNANDO',
    combinations: [[2, 2]],
  },
  {
    text: 'PRESTES A DORMIR',
    combinations: [
      [2, 3],
      [1, 3],
    ],
  },
  {
    text: 'PERDIDOS',
    combinations: [
      [2, 1],
      [1, 1],
      [1, 2],
    ],
  },
  {
    text: 'PROMISSORES',
    combinations: [[1, 4]],
  },
  { text: 'CLIENTES RECENTES', combinations: [[1, 5]] },
]
const getRFMLabel = (frequency: number, recency: number) => {
  const label = RFMLabels.find((l) => l.combinations.some((c) => c[0] == frequency && c[1] == recency))

  return label?.text || 'PERDIDOS'
}