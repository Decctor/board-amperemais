import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import type { TUser } from "@/schemas/users";
import { UserSchema } from "@/schemas/users";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import createHttpError from "http-errors";
import { ObjectId } from "mongodb";
import type { NextApiHandler } from "next";

type GetResponse = {
	data: TUser | TUser[];
};
const getUsersRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const session = await getUserSession({ request: req });
	if (session.visualizacao !== "GERAL") throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	const { id } = req.query;
	const db = await connectToDatabase();
	const usersCollection = db.collection<TUser>("users");

	if (id) {
		if (typeof id !== "string" || !ObjectId.isValid(id)) throw new createHttpError.BadRequest("ID inválido.");

		const user = await usersCollection.findOne({ _id: new ObjectId(id) });
		if (!user) throw new createHttpError.NotFound("Usuário não encontrado.");
		return res.status(200).json({ data: user });
	}

	const users = await usersCollection.find({}).toArray();

	return res.status(200).json({ data: users });
};

type PostResponse = {
	data: { insertedId: string };
	message: string;
};

const createUserRoute: NextApiHandler<PostResponse> = async (req, res) => {
	const session = await getUserSession({ request: req });
	if (session.visualizacao !== "GERAL") throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	const user = UserSchema.parse(req.body);

	const db = await connectToDatabase();
	const usersCollection = db.collection<TUser>("users");

	const insertResponse = await usersCollection.insertOne(user);
	if (!insertResponse.acknowledged) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar usuário.");
	const insertedId = insertResponse.insertedId.toString();
	return res.status(201).json({ data: { insertedId }, message: "Usuário criado com sucesso." });
};

type PutResponse = {
	data: string;
	message: string;
};

const updateUserRoute: NextApiHandler<PutResponse> = async (req, res) => {
	const session = await getUserSession({ request: req });
	if (session.visualizacao !== "GERAL") throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	const { id } = req.query;
	if (!id || typeof id !== "string" || !ObjectId.isValid(id)) throw new createHttpError.BadRequest("ID inválido");

	const user = UserSchema.partial().parse(req.body);

	const db = await connectToDatabase();
	const usersCollection = db.collection<TUser>("users");

	const updateResponse = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: user });
	if (!updateResponse.acknowledged) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar usuário.");
	if (updateResponse.matchedCount === 0) throw new createHttpError.NotFound("Usuário não encontrado.");

	return res.status(200).json({ data: "Usuário atualizado com sucesso.", message: "Usuário atualizado com sucesso." });
};
export default apiHandler({ GET: getUsersRoute, POST: createUserRoute, PUT: updateUserRoute });
