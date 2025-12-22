import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { PeriodQueryParamSchema } from "@/schemas/query-params-utils";
import { db } from "@/services/drizzle";
import { cashbackProgramTransactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, desc, gte, lte } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CashbackProgramTransactionsInputSchema = z.object({
	period: PeriodQueryParamSchema.optional(),
	page: z.number().int().positive().default(1),
	limit: z.number().int().positive().default(10),
});
export type TCashbackProgramTransactionsInput = z.infer<typeof CashbackProgramTransactionsInputSchema>;

type TTransaction = {
	id: string;
	tipo: "ACÚMULO" | "RESGATE" | "EXPIRAÇÃO";
	status: "ATIVO" | "CONSUMIDO" | "EXPIRADO";
	valor: number;
	dataInsercao: Date;
	expiracaoData: Date | null;
	cliente: {
		id: string;
		nome: string;
	};
	venda: {
		id: string;
	} | null;
};

type GetResponse = {
	data: {
		transactions: TTransaction[];
		pagination: {
			total: number;
			page: number;
			limit: number;
			totalPages: number;
		};
	};
};

async function getCashbackProgramTransactions({
	input,
	session,
}: {
	input: TCashbackProgramTransactionsInput;
	session: TAuthUserSession["user"];
}): Promise<GetResponse> {
	const conditions = [];

	// Apply period filter if provided
	if (input.period) {
		const ajustedAfter = dayjs(input.period.after).toDate();
		const ajustedBefore = dayjs(input.period.before).endOf("day").toDate();
		conditions.push(gte(cashbackProgramTransactions.dataInsercao, ajustedAfter));
		conditions.push(lte(cashbackProgramTransactions.dataInsercao, ajustedBefore));
	}

	// Get total count
	const totalCountResult = await db
		.select({ count: count() })
		.from(cashbackProgramTransactions)
		.where(conditions.length > 0 ? and(...conditions) : undefined);

	const total = totalCountResult[0]?.count || 0;
	const totalPages = Math.ceil(total / input.limit);

	// Get paginated transactions
	const offset = (input.page - 1) * input.limit;
	const transactions = await db.query.cashbackProgramTransactions.findMany({
		where: conditions.length > 0 ? and(...conditions) : undefined,
		orderBy: [desc(cashbackProgramTransactions.dataInsercao)],
		limit: input.limit,
		offset: offset,
		with: {
			cliente: {
				columns: {
					id: true,
					nome: true,
				},
			},
			venda: {
				columns: {
					id: true,
				},
			},
		},
	});

	return {
		data: {
			transactions: transactions.map((t) => ({
				id: t.id,
				tipo: t.tipo,
				status: t.status,
				valor: t.valor,
				dataInsercao: t.dataInsercao,
				expiracaoData: t.expiracaoData,
				cliente: {
					id: t.cliente.id,
					nome: t.cliente.nome,
				},
				venda: t.venda
					? {
							id: t.venda.id,
						}
					: null,
			})),
			pagination: {
				total,
				page: input.page,
				limit: input.limit,
				totalPages,
			},
		},
	};
}

export type TCashbackProgramTransactionsOutput = Awaited<ReturnType<typeof getCashbackProgramTransactions>>;

const getCashbackProgramTransactionsRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = CashbackProgramTransactionsInputSchema.parse(payload);
	const result = await getCashbackProgramTransactions({ input, session: session.user });
	return NextResponse.json(result, { status: 200 });
};

export const POST = appApiHandler({
	POST: getCashbackProgramTransactionsRoute,
});
