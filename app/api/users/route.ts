import { apiHandler } from "@/lib/api";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { OrganizationMemberSchema } from "@/schemas/organizations";
import { NewUserSchema, UserSchema } from "@/schemas/users";
import { db } from "@/services/drizzle";
import { organizationMembers, users } from "@/services/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CreateUserInputSchema = z.object({
	user: NewUserSchema.omit({ admin: true, dataInsercao: true }),
});
export type TCreateUserInput = z.infer<typeof CreateUserInputSchema>;

async function createUser({ input, session }: { input: TCreateUserInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const sessionUserHasPermission = session.membership?.permissoes.usuarios.criar;
	if (!sessionUserHasPermission) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	const insertedUser = await db
		.insert(users)
		.values({
			...input.user,
			organizacaoId: userOrgId,
		})
		.returning({
			id: users.id,
		});
	const insertedUserId = insertedUser[0]?.id;
	if (!insertedUserId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar usuário.");

	await db.insert(organizationMembers).values({
		usuarioId: insertedUserId,
		organizacaoId: userOrgId,
		permissoes: input.user.permissoes,
	});
	return {
		data: {
			insertedId: insertedUserId,
		},
		message: "Usuário criado com sucesso.",
	};
}
export type TCreateUserOutput = Awaited<ReturnType<typeof createUser>>;

async function createUserRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership?.permissoes.usuarios.criar) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

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

async function getUsers({ input, session }: { input: TGetUsersInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const sessionUserHasPermission = session.membership?.permissoes.usuarios.visualizar;
	if (!sessionUserHasPermission) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	console.log("[INFO] [GET USERS] Input:", input);

	if ("id" in input && input.id) {
		const id = input.id;
		if (typeof id !== "string") throw new createHttpError.BadRequest("ID inválido.");
		const user = await db.query.users.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, id), eq(fields.organizacaoId, userOrgId)),
		});
		if (!user) throw new createHttpError.NotFound("Usuário não encontrado.");

		const membership = await db.query.organizationMembers.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.usuarioId, id), eq(fields.organizacaoId, userOrgId)),
		});
		if (!membership) throw new createHttpError.NotFound("Membro da organização não encontrado.");
		return {
			data: {
				byId: { ...user, associacao: membership },
				default: null,
			},
			message: "Usuário encontrado com sucesso.",
		};
	}

	const conditions = [
		inArray(
			users.id,
			db
				.select({
					id: organizationMembers.usuarioId,
				})
				.from(organizationMembers)
				.where(eq(organizationMembers.organizacaoId, userOrgId)),
		),
	];
	if (input.search)
		conditions.push(
			sql`(to_tsvector('portuguese', ${users.nome}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${users.nome} ILIKE '%' || ${input.search} || '%')`,
		);

	const usersResult = await db.query.users.findMany({
		where: and(...conditions),
		orderBy: (fields, { asc }) => asc(fields.nome),
	});
	return {
		data: {
			byId: null,
			default: usersResult,
		},
		message: "Usuários encontrados com sucesso.",
	};
}
export type TGetUsersOutput = Awaited<ReturnType<typeof getUsers>>;
export type TGetUsersOutputDefault = Exclude<TGetUsersOutput["data"]["default"], null>;
export type TGetUsersOutputById = Exclude<TGetUsersOutput["data"]["byId"], null>;

async function getUsersRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
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
	user: UserSchema.omit({ nome: true, telefone: true, email: true, dataInsercao: true, organizacaoId: true }),
	membership: OrganizationMemberSchema.omit({ organizacaoId: true, usuarioId: true, dataInsercao: true }),
});
export type TUpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

async function updateUser({ input, session }: { input: TUpdateUserInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const sessionUserHasPermission = session.membership?.permissoes.usuarios.editar;
	if (!sessionUserHasPermission) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	// Checking if the user to update has a membership
	const userToUpdateMembership = await db.query.organizationMembers.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.usuarioId, input.id), eq(fields.organizacaoId, userOrgId)),
	});
	if (!userToUpdateMembership) throw new createHttpError.NotFound("Membro da organização não encontrado.");

	// Now, updating the user
	const updatedUser = await db
		.update(users)
		.set({
			...input.user,
		})
		.where(and(eq(users.id, input.id)))
		.returning({
			id: users.id,
		});
	const updatedUserId = updatedUser[0]?.id;
	if (!updatedUserId) throw new createHttpError.NotFound("Usuário não encontrado.");

	// Now, updating the membership
	await db
		.update(organizationMembers)
		.set({
			...input.membership,
		})
		.where(and(eq(organizationMembers.usuarioId, input.id), eq(organizationMembers.organizacaoId, userOrgId)));
	return {
		data: {
			updatedId: updatedUserId,
			updatedMembershipId: userToUpdateMembership.id,
		},
		message: "Usuário atualizado com sucesso.",
	};
}
export type TUpdateUserOutput = Awaited<ReturnType<typeof updateUser>>;
export type TUpdateUserOutputUpdatedId = Exclude<TUpdateUserOutput["data"]["updatedId"], null>;

async function updateUserRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const payload = await request.json();
	const input = UpdateUserInputSchema.parse(payload);

	const result = await updateUser({ input, session });

	return NextResponse.json(result);
}

export const PUT = appApiHandler({
	PUT: updateUserRoute,
});
