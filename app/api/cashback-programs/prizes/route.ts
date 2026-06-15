import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { createSimplifiedSearchCondition } from "@/lib/search";
import { CashbackProgramPrizeSchema } from "@/schemas/cashback-programs";
import { db } from "@/services/drizzle";
import { cashbackProgramPrizes } from "@/services/drizzle/schema";
import { eq, and, count } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetCashbackProgramPrizesInputSchema = z.object({
	// by id
	id: z
		.string({
			invalid_type_error: "Tipo não válido para o ID do prêmio do programa de cashback.",
		})
		.optional()
		.nullable(),

	// general
	programId: z
		.string({
			required_error: "ID do programa de cashback não informado.",
			invalid_type_error: "Tipo não válido para o ID do programa de cashback.",
		})
		.optional()
		.nullable(),
	search: z
		.string({
			invalid_type_error: "Tipo não válido para a busca.",
		})
		.optional()
		.nullable(),
	page: z
		.string()
		.optional()
		.nullable()
		.transform((value) => (value ? Number(value) : 1)),
});
export type TGetCashbackProgramPrizesInput = z.infer<typeof GetCashbackProgramPrizesInputSchema>;

async function getCashbackProgramPrizes({ input, session }: { input: TGetCashbackProgramPrizesInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if ("id" in input) {
		const inputId = input.id;
		if (!inputId) throw new createHttpError.BadRequest("ID do prêmio do programa de cashback não informado.");
		const cashbackProgramPrize = await db.query.cashbackProgramPrizes.findFirst({
			where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, userOrgId), operators.eq(fields.id, inputId)),

			with: {
				programa: {
					columns: {
						id: true,
						titulo: true,
						terminologia: true,
					},
				},
				produto: {
					columns: {
						id: true,
						nome: true,
						grupo: true,
						precoVenda: true,
					},
				},
				produtoVariante: {
					columns: {
						id: true,
						nome: true,
						precoVenda: true,
					},
				},
			},
		});

		if (!cashbackProgramPrize) throw new createHttpError.NotFound("Prêmio do programa de cashback não encontrado.");

		return {
			data: {
				byId: cashbackProgramPrize,
				default: null,
			},
			message: "Prêmio do programa de cashback encontrado com sucesso.",
		};
	}

	const PAGE_SIZE = 25;
	const programId = input.programId;
	if (!programId) throw new createHttpError.BadRequest("ID do programa de cashback não informado.");

	const conditions = [eq(cashbackProgramPrizes.organizacaoId, userOrgId), eq(cashbackProgramPrizes.programaId, programId)];

	if (input.search) {
		conditions.push(createSimplifiedSearchCondition(cashbackProgramPrizes.titulo, input.search));
	}

	const cashbackProgramPrizesMatchedResult = await db
		.select({ count: count() })
		.from(cashbackProgramPrizes)
		.where(and(...conditions));

	const cashbackProgramPrizesMatchedCount = cashbackProgramPrizesMatchedResult[0].count as number;
	const totalPages = Math.ceil(cashbackProgramPrizesMatchedCount / PAGE_SIZE);

	const limit = PAGE_SIZE;
	const skip = PAGE_SIZE * (input.page - 1);
	const cashbackProgramPrizesResult = await db.query.cashbackProgramPrizes.findMany({
		where: and(...conditions),
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
		offset: skip,
		limit: limit,
	});

	return {
		data: {
			default: {
				prizes: cashbackProgramPrizesResult,
				prizesMatched: cashbackProgramPrizesMatchedCount,
				totalPages: totalPages,
			},
			byId: null,
		},
		message: "Prêmios do programa de cashback recuperados com sucesso.",
	};
}
export type TGetCashbackProgramPrizesOutput = Awaited<ReturnType<typeof getCashbackProgramPrizes>>;
export type TGetCashbackProgramPrizesOutputDefault = Exclude<TGetCashbackProgramPrizesOutput["data"], null>["default"];
export type TGetCashbackProgramPrizesOutputById = Exclude<TGetCashbackProgramPrizesOutput["data"], null>["byId"];

const getCashbackProgramPrizesRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetCashbackProgramPrizesInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		programId: searchParams.get("programId") ?? undefined,
		search: searchParams.get("search") ?? undefined,
		page: searchParams.get("page") ?? undefined,
	});
	const response = await getCashbackProgramPrizes({ input, session });
	return NextResponse.json(response);
};
export const GET = appApiHandler({ GET: getCashbackProgramPrizesRoute });

const CreateCashbackProgramPrizeInputSchema = z.object({
	cashbackProgramId: z
		.string({
			required_error: "ID do programa de cashback não informado.",
			invalid_type_error: "Tipo não válido para o ID do programa de cashback.",
		})
		.describe("O ID do programa de cashback."),
	cashbackProgramPrize: CashbackProgramPrizeSchema.omit({
		dataInsercao: true,
		dataAtualizacao: true,
		organizacaoId: true,
		programaId: true,
	}),
});
export type TCreateCashbackProgramPrizeInput = z.infer<typeof CreateCashbackProgramPrizeInputSchema>;

async function createCashbackProgramPrize({ input, session }: { input: TCreateCashbackProgramPrizeInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const [insertedCashbackProgramPrize] = await db
		.insert(cashbackProgramPrizes)
		.values({
			...input.cashbackProgramPrize,
			organizacaoId: userOrgId,
			programaId: input.cashbackProgramId,
		})
		.returning({ id: cashbackProgramPrizes.id });

	if (!insertedCashbackProgramPrize)
		throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar prêmio do programa de cashback.");

	return {
		data: {
			insertedId: insertedCashbackProgramPrize,
		},
		message: "Prêmio do programa de cashback criado com sucesso.",
	};
}
export type TCreateCashbackProgramPrizeOutput = Awaited<ReturnType<typeof createCashbackProgramPrize>>;
export type TCreateCashbackProgramPrizeOutputInsertedId = Exclude<TCreateCashbackProgramPrizeOutput["data"], null>["insertedId"];

const createCashbackProgramPrizeRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const input = CreateCashbackProgramPrizeInputSchema.parse(await request.json());
	const response = await createCashbackProgramPrize({ input, session });
	return NextResponse.json(response);
};
export const POST = appApiHandler({ POST: createCashbackProgramPrizeRoute });

const UpdateCashbackProgramPrizeInputSchema = z.object({
	cashbackProgramPrizeId: z
		.string({
			required_error: "ID do prêmio do programa de cashback não informado.",
			invalid_type_error: "Tipo não válido para o ID do prêmio do programa de cashback.",
		})
		.describe("O ID do prêmio do programa de cashback."),
	cashbackProgramPrize: CashbackProgramPrizeSchema.omit({
		dataInsercao: true,
		dataAtualizacao: true,
		organizacaoId: true,
		programaId: true,
	}),
});
export type TUpdateCashbackProgramPrizeInput = z.infer<typeof UpdateCashbackProgramPrizeInputSchema>;

async function updateCashbackProgramPrize({ input, session }: { input: TUpdateCashbackProgramPrizeInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const [updatedCashbackProgramPrize] = await db
		.update(cashbackProgramPrizes)
		.set({
			...input.cashbackProgramPrize,
			organizacaoId: userOrgId,
		})
		.where(and(eq(cashbackProgramPrizes.id, input.cashbackProgramPrizeId), eq(cashbackProgramPrizes.organizacaoId, userOrgId)))
		.returning({ id: cashbackProgramPrizes.id });

	if (!updatedCashbackProgramPrize)
		throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar prêmio do programa de cashback.");

	return {
		data: {
			updatedId: updatedCashbackProgramPrize,
		},
		message: "Prêmio do programa de cashback atualizado com sucesso.",
	};
}
export type TUpdateCashbackProgramPrizeOutput = Awaited<ReturnType<typeof updateCashbackProgramPrize>>;
export type TUpdateCashbackProgramPrizeOutputUpdatedId = Exclude<TUpdateCashbackProgramPrizeOutput["data"], null>["updatedId"];

const updateCashbackProgramPrizeRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const input = UpdateCashbackProgramPrizeInputSchema.parse(await request.json());
	const response = await updateCashbackProgramPrize({ input, session });
	return NextResponse.json(response);
};
export const PUT = appApiHandler({ PUT: updateCashbackProgramPrizeRoute });
