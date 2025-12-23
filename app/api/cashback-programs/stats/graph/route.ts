import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getBestNumberOfPointsBetweenDates, getDateBuckets, getEvenlySpacedDates } from "@/lib/dates";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, asc, countDistinct, eq, gte, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CashbackProgramsGraphInputSchema = z.object({
	graphType: z.enum(["participants-growth", "total-cashback-generated", "total-cashback-rescued"]),
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Formato de data inválido." })
		.optional()
		.nullable()
		.transform((v) => (v ? dayjs(v).startOf("day").toDate() : undefined)),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Formato de data inválido." })
		.optional()
		.nullable()
		.transform((v) => (v ? dayjs(v).endOf("day").toDate() : undefined)),
});
export type TCashbackProgramsGraphInput = z.infer<typeof CashbackProgramsGraphInputSchema>;

// We will have graphs for:
// - participants growth
// - total (cummulative) cashback generated
// - total (cummulative) cashback rescued
async function getCashbackProgramsGraph({
	input,
	sessionUser,
}: {
	input: TCashbackProgramsGraphInput;
	sessionUser: TAuthUserSession["user"];
}) {
	const period = {
		after: input.periodAfter,
		before: input.periodBefore,
	};

	console.log("[INFO] [GET CASHBACK PROGRAMS GRAPH] Period:", period);
	if (!period.after) {
		const firstCashbackProgramAssociation = await db
			.select({
				date: cashbackProgramBalances.dataInsercao,
			})
			.from(cashbackProgramBalances)
			.orderBy(asc(cashbackProgramBalances.dataInsercao))
			.limit(1);
		period.after = firstCashbackProgramAssociation[0]?.date ?? undefined;
		if (!period.after) throw new createHttpError.BadRequest("Não foi possível encontrar a primeira associação do programa de cashback.");
	}

	if (!period.before) {
		period.before = new Date();
	}

	const { points: bestNumberOfPointsForPeriodsDates, groupingFormat } = getBestNumberOfPointsBetweenDates({
		startDate: period.after,
		endDate: period.before,
	});

	const periodDatesStrs = getEvenlySpacedDates({
		startDate: period.after,
		endDate: period.before,
		points: bestNumberOfPointsForPeriodsDates,
	});

	const periodDateBuckets = getDateBuckets(periodDatesStrs);

	if (input.graphType === "participants-growth") {
		// Obter total de participantes ANTES do início do período
		const participantsBeforePeriod = await db
			.select({
				total: countDistinct(cashbackProgramBalances.clienteId),
			})
			.from(cashbackProgramBalances)
			.where(lte(cashbackProgramBalances.dataInsercao, period.after));

		const initialTotal = Number(participantsBeforePeriod[0]?.total || 0);

		const participantsGrowth = await db
			.select({
				date: sql<string>`date_trunc('day', ${cashbackProgramBalances.dataInsercao})::text`,
				total: countDistinct(cashbackProgramBalances.clienteId),
			})
			.from(cashbackProgramBalances)
			.where(and(gte(cashbackProgramBalances.dataInsercao, period.after), lte(cashbackProgramBalances.dataInsercao, period.before)))
			.orderBy(sql`date_trunc('day', ${cashbackProgramBalances.dataInsercao})`)
			.groupBy(sql`date_trunc('day', ${cashbackProgramBalances.dataInsercao})`);

		const initialParticipantsGrowth = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const participantsGrowthReduced = participantsGrowth.reduce((acc, current) => {
			const saleDate = new Date(current.date);
			const saleTime = saleDate.getTime();

			const bucket = periodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total);
			return acc;
		}, initialParticipantsGrowth);

		// Transformar em valores acumulados
		let accumulated = initialTotal;
		const participantsGrowthGraph = Object.entries(participantsGrowthReduced).map(([key, value]) => {
			accumulated += value.value;
			return {
				label: key,
				value: accumulated,
			};
		});

		return {
			data: participantsGrowthGraph,
		};
	}

	if (input.graphType === "total-cashback-generated") {
		// Obter total de cashback gerado ANTES do início do período
		const cashbackGeneratedBeforePeriod = await db
			.select({
				total: sum(cashbackProgramTransactions.valor),
			})
			.from(cashbackProgramTransactions)
			.where(and(eq(cashbackProgramTransactions.tipo, "ACÚMULO"), lte(cashbackProgramTransactions.dataInsercao, period.after)));

		const initialTotal = Number(cashbackGeneratedBeforePeriod[0]?.total || 0);

		const totalCashbackGenerated = await db
			.select({
				date: sql<string>`date_trunc('day', ${cashbackProgramTransactions.dataInsercao})::text`,
				total: sum(cashbackProgramTransactions.valor),
			})
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.tipo, "ACÚMULO"),
					gte(cashbackProgramTransactions.dataInsercao, period.after),
					lte(cashbackProgramTransactions.dataInsercao, period.before),
				),
			)
			.orderBy(sql`date_trunc('day', ${cashbackProgramTransactions.dataInsercao})`)
			.groupBy(sql`date_trunc('day', ${cashbackProgramTransactions.dataInsercao})`);

		const initialTotalCashbackGenerated = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const totalCashbackGeneratedReduced = totalCashbackGenerated.reduce((acc, current) => {
			const saleDate = new Date(current.date);
			const saleTime = saleDate.getTime();

			const bucket = periodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total);
			return acc;
		}, initialTotalCashbackGenerated);

		// Transformar em valores acumulados
		let accumulated = initialTotal;
		const totalCashbackGeneratedGraph = Object.entries(totalCashbackGeneratedReduced).map(([key, value]) => {
			accumulated += value.value;
			return {
				label: key,
				value: accumulated,
			};
		});

		return {
			data: totalCashbackGeneratedGraph,
		};
	}

	if (input.graphType === "total-cashback-rescued") {
		// Obter total de cashback resgatado ANTES do início do período
		const cashbackRescuedBeforePeriod = await db
			.select({
				total: sum(cashbackProgramTransactions.valor),
			})
			.from(cashbackProgramTransactions)
			.where(and(eq(cashbackProgramTransactions.tipo, "RESGATE"), lte(cashbackProgramTransactions.dataInsercao, period.after)));

		const initialTotal = Number(cashbackRescuedBeforePeriod[0]?.total || 0);

		const totalCashbackRescued = await db
			.select({
				date: sql<string>`date_trunc('day', ${cashbackProgramTransactions.dataInsercao})::text`,
				total: sum(cashbackProgramTransactions.valor),
			})
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.tipo, "RESGATE"),
					gte(cashbackProgramTransactions.dataInsercao, period.after),
					lte(cashbackProgramTransactions.dataInsercao, period.before),
				),
			)
			.orderBy(sql`date_trunc('day', ${cashbackProgramTransactions.dataInsercao})`)
			.groupBy(sql`date_trunc('day', ${cashbackProgramTransactions.dataInsercao})`);

		const initialTotalCashbackRescued = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const totalCashbackRescuedReduced = totalCashbackRescued.reduce((acc, current) => {
			const saleDate = new Date(current.date);
			const saleTime = saleDate.getTime();

			const bucket = periodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total);
			return acc;
		}, initialTotalCashbackRescued);

		// Transformar em valores acumulados
		let accumulated = initialTotal;
		const totalCashbackRescuedGraph = Object.entries(totalCashbackRescuedReduced).map(([key, value]) => {
			accumulated += value.value;
			return {
				label: key,
				value: accumulated,
			};
		});

		return {
			data: totalCashbackRescuedGraph,
		};
	}

	return {
		data: [],
	};
}
export type TCashbackProgramsGraphOutput = Awaited<ReturnType<typeof getCashbackProgramsGraph>>;
const getCashbackProgramsGraphRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const searchParams = request.nextUrl.searchParams;
	console.log("[INFO] [GET CASHBACK PROGRAMS GRAPH] Search params:", searchParams);
	const input = CashbackProgramsGraphInputSchema.parse({
		graphType: searchParams.get("graphType") as "participants-growth" | "total-cashback-generated" | "total-cashback-rescued",
		periodAfter: searchParams.get("periodAfter") as string | undefined,
		periodBefore: searchParams.get("periodBefore") as string | undefined,
	});
	const result = await getCashbackProgramsGraph({ input, sessionUser: session.user });
	return NextResponse.json(result, { status: 200 });
};

export const GET = appApiHandler({
	GET: getCashbackProgramsGraphRoute,
});
