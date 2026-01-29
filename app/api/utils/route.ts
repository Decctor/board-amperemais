import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { UtilsIdentifierSchema, UtilsSchema } from "@/schemas/utils";
import { db } from "@/services/drizzle";
import { utils } from "@/services/drizzle/schema/utils";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CreateUtilInputSchema = z.object({
	util: UtilsSchema,
});
export type TCreateUtilInput = z.infer<typeof CreateUtilInputSchema>;

async function createUtil({ input, session }: { input: TCreateUtilInput; session: TAuthUserSession }) {
	const userOrganizationId = session.membership?.organizacao?.id;
	if (!userOrganizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const insertedUtil = await db
		.insert(utils)
		.values({
			...input.util,
			organizacaoId: userOrganizationId,
		})
		.returning({ insertedId: utils.id });
	const insertedUtilId = insertedUtil[0]?.insertedId;
	if (!insertedUtilId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar util.");
	return {
		data: {
			insertedId: insertedUtilId,
		},
		message: "Util criado com sucesso.",
	};
}
export type TCreateUtilOutput = Awaited<ReturnType<typeof createUtil>>;

const createUtilRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = CreateUtilInputSchema.parse(payload);
	const result = await createUtil({ input, session });
	return NextResponse.json(result, { status: 201 });
};

export const POST = appApiHandler({
	POST: createUtilRoute,
});

const GetUtilsInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo não válido para ID da util." }).optional().nullable(),
	// Default
	identifier: UtilsIdentifierSchema.optional().nullable(),
});
export type TGetUtilsInput = z.infer<typeof GetUtilsInputSchema>;

async function getUtils({ input, session }: { input: TGetUtilsInput; session: TAuthUserSession }) {
	const userOrganizationId = session.membership?.organizacao?.id;
	if (!userOrganizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if ("id" in input && input.id) {
		const id = input.id;
		if (typeof id !== "string") throw new createHttpError.BadRequest("ID inválido.");
		const util = await db.query.utils.findFirst({ where: (fields, { eq }) => and(eq(fields.id, id), eq(fields.organizacaoId, userOrganizationId)) });
		if (!util) throw new createHttpError.NotFound("Util não encontrada.");
		return {
			data: {
				default: null,
				byId: util,
			},
			message: "Util encontrada com sucesso.",
		};
	}

	const conditions = [];
	if ("identifier" in input && input.identifier) {
		conditions.push(eq(utils.identificador, input.identifier));
	}
	const utilsResult = await db.query.utils.findMany({ where: and(...conditions, eq(utils.organizacaoId, userOrganizationId)) });
	return {
		data: {
			byId: null,
			default: utilsResult,
		},
		message: "Utils encontradas com sucesso.",
	};
}
export type TGetUtilsOutput = Awaited<ReturnType<typeof getUtils>>;
export type TGetUtilsOutputDefault = Exclude<TGetUtilsOutput["data"]["default"], null>;
export type TGetUtilsOutputById = Exclude<TGetUtilsOutput["data"]["byId"], null>;
const getUtilsRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const searchParams = await request.nextUrl.searchParams;
	const input = GetUtilsInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		identifier: searchParams.get("identifier") ?? undefined,
	});
	const result = await getUtils({ input, session });
	return NextResponse.json(result, { status: 200 });
};

export const GET = appApiHandler({
	GET: getUtilsRoute,
});

const UpdateUtilInputSchema = z.object({
	utilId: z.string({ invalid_type_error: "Tipo não válido para ID da util." }),
	util: UtilsSchema,
});
export type TUpdateUtilInput = z.infer<typeof UpdateUtilInputSchema>;

async function updateUtil({ input, session }: { input: TUpdateUtilInput; session: TAuthUserSession }) {
	const userOrganizationId = session.membership?.organizacao?.id;
	if (!userOrganizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const updatedUtil = await db
		.update(utils)
		.set({ ...input.util, organizacaoId: userOrganizationId })
		.where(and(eq(utils.id, input.utilId), eq(utils.organizacaoId, userOrganizationId)))
		.returning({ updatedId: utils.id });
	const updatedUtilId = updatedUtil[0]?.updatedId;
	if (!updatedUtilId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar util.");
	return {
		data: {
			updatedId: updatedUtilId,
		},
		message: "Util atualizada com sucesso.",
	};
}
export type TUpdateUtilOutput = Awaited<ReturnType<typeof updateUtil>>;

const updateUtilRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = UpdateUtilInputSchema.parse(payload);
	const result = await updateUtil({ input, session });
	return NextResponse.json(result, { status: 200 });
};

export const PUT = appApiHandler({
	PUT: updateUtilRoute,
});
