import { apiHandler } from '@/lib/api'
import { getUserSession } from '@/lib/auth/session'
import { SaleGoalSchema, TSaleGoal } from '@/schemas/sale-goals'
import { TUser, UserSchema } from '@/schemas/users'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import createHttpError from 'http-errors'
import { ObjectId } from 'mongodb'
import { NextApiHandler } from 'next'

type GetResponse = {
  data: TSaleGoal | TSaleGoal[]
}
const getGoalsRoute: NextApiHandler<GetResponse> = async (req, res) => {
  const session = await getUserSession({ request: req })
  if (session.visualizacao != 'GERAL') throw new createHttpError.BadRequest('Você não possui permissão para acessar esse recurso.')

  const { id } = req.query
  const db = await connectToDatabase()
  const goalsCollection = db.collection<TSaleGoal>('goals')

  if (id) {
    if (typeof id != 'string' || !ObjectId.isValid(id)) throw new createHttpError.BadRequest('ID inválido.')

    const goal = await goalsCollection.findOne({ _id: new ObjectId(id) })
    if (!goal) throw new createHttpError.NotFound('Meta não encontrada.')
    return res.status(200).json({ data: goal })
  }

  const goals = await goalsCollection.find({}).toArray()

  return res.status(200).json({ data: goals })
}

type PostResponse = {
  data: { insertedId: string }
  message: string
}

const createGoalRoute: NextApiHandler<PostResponse> = async (req, res) => {
  const session = await getUserSession({ request: req })
  if (session.visualizacao != 'GERAL') throw new createHttpError.BadRequest('Você não possui permissão para acessar esse recurso.')

  const goal = SaleGoalSchema.parse(req.body)

  const db = await connectToDatabase()
  const goalsCollection = db.collection<TSaleGoal>('goals')

  const insertResponse = await goalsCollection.insertOne(goal)
  if (!insertResponse.acknowledged) throw new createHttpError.InternalServerError('Oops, houve um erro desconhecido ao criar meta.')
  const insertedId = insertResponse.insertedId.toString()
  return res.status(201).json({ data: { insertedId }, message: 'Meta criada com sucesso.' })
}

type PutResponse = {
  data: string
  message: string
}

const updateGoalRoute: NextApiHandler<PutResponse> = async (req, res) => {
  const session = await getUserSession({ request: req })
  if (session.visualizacao != 'GERAL') throw new createHttpError.BadRequest('Você não possui permissão para acessar esse recurso.')

  const { id } = req.query
  if (!id || typeof id != 'string' || !ObjectId.isValid(id)) throw new createHttpError.BadRequest('ID inválido')

  const goal = SaleGoalSchema.partial().parse(req.body)

  const db = await connectToDatabase()
  const goalsCollection = db.collection<TSaleGoal>('goals')

  const updateResponse = await goalsCollection.updateOne({ _id: new ObjectId(id) }, { $set: goal })
  if (!updateResponse.acknowledged) throw new createHttpError.InternalServerError('Oops, houve um erro desconhecido ao atualizar meta.')
  if (updateResponse.matchedCount == 0) throw new createHttpError.NotFound('Meta não encontrada.')

  return res.status(200).json({ data: 'Meta atualizada com sucesso.', message: 'Meta atualizada com sucesso.' })
}
export default apiHandler({ GET: getGoalsRoute, POST: createGoalRoute, PUT: updateGoalRoute })
