import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getBestNumberOfPointsBetweenDates, getDateBuckets, getEvenlySpacedDates } from "@/lib/dates";
import { canViewFinances } from "@/lib/permissions/finances";
import { db } from "@/services/drizzle";
import { financialTransactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetFinancialAccountGraphInputSchema = z.object({
	contaFinanceiraId: z.string({
		required_error: "ID da conta financeira não informado.",
		invalid_type_error: "Tipo inválido para ID da conta financeira.",
	}),
	startDate: z
		.string({ invalid_type_error: "Tipo inválido para período." })
		.datetime({ message: "Formato de data inválido." })
		.optional()
		.nullable()
		.transform((v) => (v ? dayjs(v).startOf("day").toDate() : undefined)),
	endDate: z
		.string({ invalid_type_error: "Tipo inválido para período." })
		.datetime({ message: "Formato de data inválido." })
		.optional()
		.nullable()
		.transform((v) => (v ? dayjs(v).endOf("day").toDate() : undefined)),
	comparingStartDate: z
		.string({ invalid_type_error: "Tipo inválido para período de comparação." })
		.datetime({ message: "Formato de data inválido." })
		.optional()
		.nullable()
		.transform((v) => (v ? dayjs(v).startOf("day").toDate() : undefined)),
	comparingEndDate: z
		.string({ invalid_type_error: "Tipo inválido para período de comparação." })
		.datetime({ message: "Formato de data inválido." })
		.optional()
		.nullable()
		.transform((v) => (v ? dayjs(v).endOf("day").toDate() : undefined)),
});

export type TGetFinancialAccountGraphInput = z.infer<typeof GetFinancialAccountGraphInputSchema>;

async function getGraphDataForPeriod({
	period,
	bucketCount,
	groupingFormat,
	userOrgId,
	contaFinanceiraId,
}: {
	period: { after: Date; before: Date };
	bucketCount: number;
	groupingFormat: string;
	userOrgId: string;
	contaFinanceiraId: string;
}): Promise<Array<{ label: string; entries: number; exits: number }>> {
	const periodDates = getEvenlySpacedDates({
		startDate: period.after,
		endDate: period.before,
		points: bucketCount,
	});

	const periodDateBuckets = getDateBuckets(periodDates);

	const transactionData = await db
		.select({
			date: sql<string>`date_trunc('day', ${financialTransactions.dataEfetivacao})::text`,
			entries: sql<number>`COALESCE(SUM(CASE WHEN ${financialTransactions.tipo} = 'ENTRADA' THEN ${financialTransactions.valor} ELSE 0 END), 0)`,
			exits: sql<number>`COALESCE(SUM(CASE WHEN ${financialTransactions.tipo} = 'SAIDA' THEN ${financialTransactions.valor} ELSE 0 END), 0)`,
		})
		.from(financialTransactions)
		.where(
			and(
				eq(financialTransactions.organizacaoId, userOrgId),
				eq(financialTransactions.contaFinanceiraId, contaFinanceiraId),
				isNotNull(financialTransactions.dataEfetivacao),
				gte(financialTransactions.dataEfetivacao, period.after),
				lte(financialTransactions.dataEfetivacao, period.before),
			),
		)
		.orderBy(sql`date_trunc('day', ${financialTransactions.dataEfetivacao})`)
		.groupBy(sql`date_trunc('day', ${financialTransactions.dataEfetivacao})`);

	const initialData = Object.fromEntries(periodDates.map((date) => [dayjs(date).format(groupingFormat), { entries: 0, exits: 0 }]));

	const dataReduced = transactionData.reduce((acc, current) => {
		const itemDate = new Date(current.date);
		const itemTime = itemDate.getTime();

		const bucket = periodDateBuckets.find((b) => itemTime >= b.start && itemTime <= b.end);
		if (!bucket) return acc;

		const key = dayjs(bucket.key).format(groupingFormat);
		if (!acc[key]) acc[key] = { entries: 0, exits: 0 };

		acc[key].entries += Number(current.entries);
		acc[key].exits += Number(current.exits);
		return acc;
	}, initialData);

	return Object.entries(dataReduced).map(([key, value]) => ({
		label: key,
		entries: value.entries,
		exits: value.exits,
	}));
}

async function getFinancialAccountGraph({ input, session }: { input: TGetFinancialAccountGraphInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const period = {
		after: input.startDate ?? dayjs().subtract(30, "days").startOf("day").toDate(),
		before: input.endDate ?? dayjs().endOf("day").toDate(),
	};

	const { points: bucketCount, groupingFormat } = getBestNumberOfPointsBetweenDates({
		startDate: period.after,
		endDate: period.before,
	});

	const mainData = await getGraphDataForPeriod({
		period: { after: period.after, before: period.before },
		bucketCount,
		groupingFormat,
		userOrgId,
		contaFinanceiraId: input.contaFinanceiraId,
	});

	let comparisonData: Array<{ label: string; entries: number; exits: number }> | null = null;
	if (input.comparingStartDate && input.comparingEndDate) {
		comparisonData = await getGraphDataForPeriod({
			period: { after: input.comparingStartDate, before: input.comparingEndDate },
			bucketCount,
			groupingFormat,
			userOrgId,
			contaFinanceiraId: input.contaFinanceiraId,
		});
	}

	const mergedData = mainData.map((item, index) => ({
		label: item.label,
		entries: item.entries,
		exits: item.exits,
		comparingEntries: comparisonData?.[index]?.entries,
		comparingExits: comparisonData?.[index]?.exits,
	}));

	return {
		data: mergedData,
		message: "Gráfico da conta financeira recuperado com sucesso.",
	};
}

export type TGetFinancialAccountGraphOutput = Awaited<ReturnType<typeof getFinancialAccountGraph>>;

const getFinancialAccountGraphRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	if (!canViewFinances(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetFinancialAccountGraphInputSchema.parse({
		contaFinanceiraId: searchParams.get("contaFinanceiraId"),
		startDate: searchParams.get("startDate") ?? null,
		endDate: searchParams.get("endDate") ?? null,
		comparingStartDate: searchParams.get("comparingStartDate") ?? null,
		comparingEndDate: searchParams.get("comparingEndDate") ?? null,
	});

	const result = await getFinancialAccountGraph({ input, session });
	return NextResponse.json(result, { status: 200 });
};

export const GET = appApiHandler({
	GET: getFinancialAccountGraphRoute,
});
