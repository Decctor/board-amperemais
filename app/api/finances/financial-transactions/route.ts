import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { financialTransactions } from "@/services/drizzle/schema";
import { and, count, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, type SQL } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { FinancialTransactionTypeEnum, PaymentMethodEnum, TFinancialTransactionTypeEnum, TPaymentMethodEnum } from "@/schemas/enums";

const VALID_STATUSES = ["pendente", "efetivada", "em-atraso"] as const;
export type TFinancialTransactionStatus = (typeof VALID_STATUSES)[number];

const GetFinancialTransactionsInputSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	search: z.string().optional().nullable(),
	periodAfter: z
		.string()
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	periodBefore: z
		.string()
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	types: z.string().optional().nullable(),
	paymentMethods: z.string().optional().nullable(),
	statuses: z.string().optional().nullable(),
});
export type TGetFinancialTransactionsInput = z.infer<typeof GetFinancialTransactionsInputSchema>;

async function getFinancialTransactions({ input, session }: { input: TGetFinancialTransactionsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { page, search, periodAfter, periodBefore, types, paymentMethods, statuses } = input;

	const typesArr = types ? (types.split(",").filter((v) => FinancialTransactionTypeEnum.safeParse(v).success) as TFinancialTransactionTypeEnum[]) : [];
	const paymentMethodsArr = paymentMethods
		? (paymentMethods.split(",").filter((v) => PaymentMethodEnum.safeParse(v).success) as TPaymentMethodEnum[])
		: [];
	const statusesArr = statuses
		? statuses.split(",").filter((v): v is TFinancialTransactionStatus => VALID_STATUSES.includes(v as TFinancialTransactionStatus))
		: [];

	const now = new Date();
	const conditions = [eq(financialTransactions.organizacaoId, userOrgId)];
	if (search && search.trim().length > 0) conditions.push(ilike(financialTransactions.titulo, `%${search.trim()}%`));
	if (periodAfter) conditions.push(gte(financialTransactions.dataPrevisao, periodAfter));
	if (periodBefore) conditions.push(lte(financialTransactions.dataPrevisao, periodBefore));
	if (typesArr.length > 0) conditions.push(inArray(financialTransactions.tipo, typesArr));
	if (paymentMethodsArr.length > 0) conditions.push(inArray(financialTransactions.metodo, paymentMethodsArr));

	if (statusesArr.length > 0) {
		const statusConditions: SQL<unknown>[] = [];
		if (statusesArr.includes("pendente")) {
			const c = and(isNull(financialTransactions.dataEfetivacao), gte(financialTransactions.dataPrevisao, now));
			if (c) statusConditions.push(c);
		}
		if (statusesArr.includes("efetivada")) {
			statusConditions.push(isNotNull(financialTransactions.dataEfetivacao));
		}
		if (statusesArr.includes("em-atraso")) {
			const c = and(isNull(financialTransactions.dataEfetivacao), lte(financialTransactions.dataPrevisao, now));
			if (c) statusConditions.push(c);
		}
		if (statusConditions.length > 0) {
			const orCondition = or(...statusConditions);
			if (orCondition) conditions.push(orCondition);
		}
	}

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (page - 1);

	const [countResult, transactionsResult] = await Promise.all([
		db
			.select({ count: count() })
			.from(financialTransactions)
			.where(and(...conditions)),
		db.query.financialTransactions.findMany({
			where: and(...conditions),
			with: {
				contaFinanceira: { columns: { id: true, nome: true, tipo: true } },
				autor: { columns: { id: true, nome: true, avatarUrl: true } },
			},
			orderBy: (fields, { desc }) => desc(fields.dataPrevisao),
			limit: PAGE_SIZE,
			offset: skip,
		}),
	]);

	const transactionsMatched = countResult[0]?.count ?? 0;
	const totalPages = Math.ceil(transactionsMatched / PAGE_SIZE);

	return {
		data: {
			default: {
				transactions: transactionsResult,
				transactionsMatched,
				totalPages,
			},
		},
	};
}
export type TGetFinancialTransactionsOutput = Awaited<ReturnType<typeof getFinancialTransactions>>;
export type TGetFinancialTransactionsOutputDefault = Exclude<TGetFinancialTransactionsOutput["data"]["default"], null>;

async function getFinancialTransactionsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetFinancialTransactionsInputSchema.parse({
		page: searchParams.get("page") ?? 1,
		search: searchParams.get("search") ?? undefined,
		periodAfter: searchParams.get("periodAfter") ?? undefined,
		periodBefore: searchParams.get("periodBefore") ?? undefined,
		types: searchParams.get("types") ?? undefined,
		paymentMethods: searchParams.get("paymentMethods") ?? undefined,
		statuses: searchParams.get("statuses") ?? undefined,
	});
	const result = await getFinancialTransactions({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFinancialTransactionsRoute });
