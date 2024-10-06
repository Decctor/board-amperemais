import { apiHandler } from '@/lib/api'
import { getUserSession } from '@/lib/auth/session'
import { MarketingControlSchema, TMarketingControl } from '@/schemas/marketing-controls'
import { SaleGoalSchema, TSaleGoal } from '@/schemas/sale-goals'
import { TUser, UserSchema } from '@/schemas/users'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import createHttpError from 'http-errors'
import { ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'

type GetResponse = {
  data: TMarketingControl | TMarketingControl[]
}
const getControlsRoute: NextApiHandler<GetResponse> = async (req, res) => {
  const session = await getUserSession({ request: req })
  if (session.visualizacao != 'GERAL') throw new createHttpError.BadRequest('Você não possui permissão para acessar esse recurso.')

  const { id } = req.query
  const db = await connectToDatabase()
  const controlsCollection = db.collection<TMarketingControl>('marketing-controls')

  if (id) {
    if (typeof id != 'string' || !ObjectId.isValid(id)) throw new createHttpError.BadRequest('ID inválido.')

    const goal = await controlsCollection.findOne({ _id: new ObjectId(id) })
    if (!goal) throw new createHttpError.NotFound('Meta não encontrada.')
    return res.status(200).json({ data: goal })
  }

  const goals = await controlsCollection.find({}).toArray()

  return res.status(200).json({ data: goals })
}

type PostResponse = {
  data: { insertedId: string }
  message: string
}

const createControlRoute: NextApiHandler<PostResponse> = async (req, res) => {
  const session = await getUserSession({ request: req })
  if (session.visualizacao != 'GERAL') throw new createHttpError.BadRequest('Você não possui permissão para acessar esse recurso.')

  const control = MarketingControlSchema.parse(req.body)

  const db = await connectToDatabase()
  const controlsCollection = db.collection<TMarketingControl>('marketing-controls')

  const insertResponse = await controlsCollection.insertOne(control)
  if (!insertResponse.acknowledged) throw new createHttpError.InternalServerError('Oops, houve um erro desconhecido ao criar controle de marketing.')
  const insertedId = insertResponse.insertedId.toString()
  return res.status(201).json({ data: { insertedId }, message: 'Controle de marketing criado com sucesso.' })
}

type PutResponse = {
  data: string
  message: string
}

const updateControlRoute: NextApiHandler<PutResponse> = async (req, res) => {
  const session = await getUserSession({ request: req })
  if (session.visualizacao != 'GERAL') throw new createHttpError.BadRequest('Você não possui permissão para acessar esse recurso.')

  const { id } = req.query
  if (!id || typeof id != 'string' || !ObjectId.isValid(id)) throw new createHttpError.BadRequest('ID inválido')

  const control = MarketingControlSchema.partial().parse(req.body)

  const db = await connectToDatabase()
  const controlsCollection = db.collection<TMarketingControl>('marketing-controls')

  const updateResponse = await controlsCollection.updateOne({ _id: new ObjectId(id) }, { $set: control })
  if (!updateResponse.acknowledged) throw new createHttpError.InternalServerError('Oops, houve um erro desconhecido ao atualizar controle de marketing.')
  if (updateResponse.matchedCount == 0) throw new createHttpError.NotFound('Controle de marketing não encontrado.')

  return res.status(200).json({ data: 'Controle de marketing atualizado com sucesso.', message: 'Controle de marketing atualizado com sucesso.' })
}
export default apiHandler({ GET: getControlsRoute, POST: createControlRoute, PUT: updateControlRoute })
