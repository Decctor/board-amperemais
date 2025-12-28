import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { CashbackProgramSchema } from "@/schemas/cashback-programs";
import { db } from "@/services/drizzle";
import { cashbackPrograms } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

async function getCashbackPrograms({ session }: { session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
	});

	return {
		data: cashbackProgram ?? null,
	};
}
export type TGetCashbackProgramOutput = Awaited<ReturnType<typeof getCashbackPrograms>>;

const getCashbackProgramsRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const result = await getCashbackPrograms({ session: session.user });
	return NextResponse.json(result, { status: 200 });
};
export const GET = appApiHandler({
	GET: getCashbackProgramsRoute,
});

const CreateCashbackProgramInputSchema = z.object({
	cashbackProgram: CashbackProgramSchema.omit({ dataInsercao: true, dataAtualizacao: true }),
});
export type TCreateCashbackProgramInput = z.infer<typeof CreateCashbackProgramInputSchema>;

async function createCashbackProgram({ input, session }: { input: TCreateCashbackProgramInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const insertedCashbackProgram = await db
		.insert(cashbackPrograms)
		.values({ ...input.cashbackProgram, organizacaoId: userOrgId })
		.returning({ id: cashbackPrograms.id });
	const insertedCashbackProgramId = insertedCashbackProgram[0]?.id;
	if (!insertedCashbackProgramId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar programa de cashback.");
	return {
		data: {
			insertedId: insertedCashbackProgramId,
		},
		message: "Programa de cashback criado com sucesso.",
	};
}
export type TCreateCashbackProgramOutput = Awaited<ReturnType<typeof createCashbackProgram>>;

const createCashbackProgramRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = CreateCashbackProgramInputSchema.parse(payload);
	const result = await createCashbackProgram({ input, session: session.user });
	return NextResponse.json(result, { status: 200 });
};
export const POST = appApiHandler({
	POST: createCashbackProgramRoute,
});

const UpdateCashbackProgramInputSchema = z.object({
	cashbackProgramId: z.string({
		required_error: "ID do programa de cashback não informado.",
		invalid_type_error: "Tipo não válido para o ID do programa de cashback.",
	}),
	cashbackProgram: CashbackProgramSchema.omit({ dataInsercao: true, dataAtualizacao: true }),
});
export type TUpdateCashbackProgramInput = z.infer<typeof UpdateCashbackProgramInputSchema>;

async function updateCashbackProgram({ input, session }: { input: TUpdateCashbackProgramInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const updatedCashbackProgram = await db
		.update(cashbackPrograms)
		.set({ ...input.cashbackProgram, organizacaoId: userOrgId })
		.where(and(eq(cashbackPrograms.id, input.cashbackProgramId), eq(cashbackPrograms.organizacaoId, userOrgId)))
		.returning({ id: cashbackPrograms.id });
	const updatedCashbackProgramId = updatedCashbackProgram[0]?.id;
	if (!updatedCashbackProgramId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar programa de cashback.");
	return {
		data: {
			updatedId: updatedCashbackProgramId,
		},
		message: "Programa de cashback atualizado com sucesso.",
	};
}
export type TUpdateCashbackProgramOutput = Awaited<ReturnType<typeof updateCashbackProgram>>;

const updateCashbackProgramRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = UpdateCashbackProgramInputSchema.parse(payload);
	const result = await updateCashbackProgram({ input, session: session.user });
	return NextResponse.json(result, { status: 200 });
};

export const PUT = appApiHandler({
	PUT: updateCashbackProgramRoute,
});
