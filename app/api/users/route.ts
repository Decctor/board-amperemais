import { apiHandler } from "@/lib/api";
import { appApiHandler } from "@/lib/app-api";
import { getRouteUserSession } from "@/lib/auth/app-session";
import { getUserSession } from "@/lib/auth/session";
import { type TUser, type TUserSession, UserSchema } from "@/schemas/users";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import createHttpError from "http-errors";
import { type Filter, ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CreateUserInputSchema = z.object({
	user: UserSchema.omit({ dataInsercao: true }),
});
export type TCreateUserInput = z.infer<typeof CreateUserInputSchema>;

async function createUser({ input, session }: { input: TCreateUserInput; session: TUserSession }) {
	const sessionUserHasPermission = session.visualizacao === "GERAL";
	if (!sessionUserHasPermission) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	const db = await connectToDatabase();
	const usersCollection = db.collection<TUser>("users");

	const insertedUserResponse = await usersCollection.insertOne({ ...input.user, dataInsercao: new Date().toISOString() });

	if (!insertedUserResponse.acknowledged) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar usuário.");
	const insertedUserId = insertedUserResponse.insertedId.toString();

	return {
		data: {
			insertedId: insertedUserId,
		},
		message: "Usuário criado com sucesso.",
	};
}
export type TCreateUserOutput = Awaited<ReturnType<typeof createUser>>;

async function createUserRoute(request: NextRequest) {
	const session = await getRouteUserSession();

	const payload = await request.json();

	const input = CreateUserInputSchema.parse(payload);

	const result = await createUser({ input, session });

	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: createUserRoute,
});

const GetUsersInputSchema = z.object({
	id: z
		.string({
			required_error: "ID do usuário não informado.",
			invalid_type_error: "Tipo inválido para ID do usuário.",
		})
		.optional()
		.nullable(),
	search: z
		.string({
			required_error: "Busca não informada.",
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
});
export type TGetUsersInput = z.infer<typeof GetUsersInputSchema>;

async function getUsers({ input, session }: { input: TGetUsersInput; session: TUserSession }) {
	console.log("[INFO] [GET USERS] Input:", input);
	const db = await connectToDatabase();
	const usersCollection = db.collection<TUser>("users");
	if ("id" in input && input.id) {
		if (typeof input.id !== "string" || !ObjectId.isValid(input.id)) throw new createHttpError.BadRequest("ID inválido.");
		const user = await usersCollection.findOne({ _id: new ObjectId(input.id) });
		if (!user) throw new createHttpError.NotFound("Usuário não encontrado.");
		return {
			data: {
				byId: { ...user, _id: user._id.toString() },
				default: null,
			},
			message: "Usuário encontrado com sucesso.",
		};
	}

	const searchQuery: Filter<TUser> =
		input.search && input.search.trim().length > 0
			? {
					$or: [{ nome: { $regex: input.search, $options: "i" } }, { telefone: { $regex: input.search, $options: "i" } }],
				}
			: {};

	const users = await usersCollection.find(searchQuery).toArray();
	return {
		data: {
			byId: null,
			default: users.map((u) => ({
				_id: u._id.toString(),
				nome: u.nome,
				cpf: u.cpf,
				dataNascimento: u.dataNascimento,
				telefone: u.telefone,
				email: u.email,
				usuario: u.usuario,
				visualizacao: u.visualizacao,
				vendedor: u.vendedor,
				dataInsercao: u.dataInsercao,
				avatar: u.avatar,
			})),
		},
		message: "Usuários encontrados com sucesso.",
	};
}
export type TGetUsersOutput = Awaited<ReturnType<typeof getUsers>>;
export type TGetUsersOutputDefault = Exclude<TGetUsersOutput["data"]["default"], null>;
export type TGetUsersOutputById = Exclude<TGetUsersOutput["data"]["byId"], null>;

async function getUsersRoute(request: NextRequest) {
	const session = await getRouteUserSession();
	const searchParams = request.nextUrl.searchParams;
	console.log("[INFO] [GET USERS] Search params:", searchParams);
	const input = GetUsersInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		search: searchParams.get("search") ?? undefined,
	});

	const result = await getUsers({ input, session });

	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getUsersRoute,
});

const UpdateUserInputSchema = z.object({
	id: z.string({
		required_error: "ID do usuário não informado.",
		invalid_type_error: "Tipo inválido para ID do usuário.",
	}),
	user: UserSchema.omit({ dataInsercao: true }),
});
export type TUpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

async function updateUser({ input, session }: { input: TUpdateUserInput; session: TUserSession }) {
	const sessionUserHasPermission = session.visualizacao === "GERAL";
	if (!sessionUserHasPermission) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	const db = await connectToDatabase();
	const usersCollection = db.collection<TUser>("users");

	const updatedUserResponse = await usersCollection.updateOne({ _id: new ObjectId(input.id) }, { $set: input.user });
	if (!updatedUserResponse.acknowledged) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar usuário.");
	if (updatedUserResponse.matchedCount === 0) throw new createHttpError.NotFound("Usuário não encontrado.");

	return {
		data: {
			updatedId: input.id,
		},
		message: "Usuário atualizado com sucesso.",
	};
}
export type TUpdateUserOutput = Awaited<ReturnType<typeof updateUser>>;
export type TUpdateUserOutputUpdatedId = Exclude<TUpdateUserOutput["data"]["updatedId"], null>;

async function updateUserRoute(request: NextRequest) {
	const session = await getRouteUserSession();

	const payload = await request.json();
	const input = UpdateUserInputSchema.parse(payload);

	const result = await updateUser({ input, session });

	return NextResponse.json(result);
}

export const PUT = appApiHandler({
	PUT: updateUserRoute,
});
