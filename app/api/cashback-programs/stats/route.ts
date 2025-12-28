import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { PeriodQueryParamSchema } from "@/schemas/query-params-utils";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, countDistinct, eq, gte, lte, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CashbackProgramStatsInputSchema = z.object({
	period: PeriodQueryParamSchema,
});
export type TCashbackProgramStatsInput = z.infer<typeof CashbackProgramStatsInputSchema>;

type TCashbackProgramStats = {
	totalParticipants: {
		atual: number;
		anterior: number | undefined;
	};
	totalNewParticipants: {
		atual: number;
		anterior: number | undefined;
	};
	totalCashbackGenerated: {
		atual: number;
		anterior: number | undefined;
	};
	totalCashbackRescued: {
		atual: number;
		anterior: number | undefined;
	};
	redemptionRate: {
		atual: number;
		anterior: number | undefined;
	};
	totalExpiredCashback: {
		atual: number;
		anterior: number | undefined;
	};
	totalExpiringCashback: {
		atual: number;
		anterior: number | undefined;
	};
};

type GetResponse = {
	data: TCashbackProgramStats;
};

async function getCashbackProgramStats({
	input,
	session,
}: {
	input: TCashbackProgramStatsInput;
	session: TAuthUserSession["user"];
}): Promise<GetResponse> {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const ajustedAfter = dayjs(input.period.after).toDate();
	const ajustedBefore = dayjs(input.period.before).endOf("day").toDate();

	// Calculate current period stats
	const [generatedResult, rescuedResult, expiredResult, participantsResult, newParticipantsResult] = await Promise.all([
		// Total cashback generated (ACÚMULO)
		db
			.select({ total: sum(cashbackProgramTransactions.valor) })
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.organizacaoId, userOrgId),
					eq(cashbackProgramTransactions.tipo, "ACÚMULO"),
					gte(cashbackProgramTransactions.dataInsercao, ajustedAfter),
					lte(cashbackProgramTransactions.dataInsercao, ajustedBefore),
				),
			),
		// Total cashback rescued (RESGATE)
		db
			.select({ total: sum(cashbackProgramTransactions.valor) })
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.organizacaoId, userOrgId),
					eq(cashbackProgramTransactions.tipo, "RESGATE"),
					gte(cashbackProgramTransactions.dataInsercao, ajustedAfter),
					lte(cashbackProgramTransactions.dataInsercao, ajustedBefore),
				),
			),
		// Total expired cashback
		db
			.select({ total: sum(cashbackProgramTransactions.valor) })
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.organizacaoId, userOrgId),
					eq(cashbackProgramTransactions.status, "EXPIRADO"),
					gte(cashbackProgramTransactions.dataInsercao, ajustedAfter),
					lte(cashbackProgramTransactions.dataInsercao, ajustedBefore),
				),
			),
		// Total participants
		db
			.select({ total: countDistinct(cashbackProgramBalances.clienteId) })
			.from(cashbackProgramBalances)
			.where(and(eq(cashbackProgramBalances.organizacaoId, userOrgId), lte(cashbackProgramBalances.dataInsercao, ajustedBefore))),
		// Total new participants
		db
			.select({ total: countDistinct(cashbackProgramBalances.clienteId) })
			.from(cashbackProgramBalances)
			.where(
				and(
					eq(cashbackProgramBalances.organizacaoId, userOrgId),
					gte(cashbackProgramBalances.dataInsercao, ajustedAfter),
					lte(cashbackProgramBalances.dataInsercao, ajustedBefore),
				),
			),
	]);

	// Total expiring cashback (within 30 days and ATIVO)
	const expiringDate = dayjs().add(30, "days").toDate();
	const expiringResult = await db
		.select({ total: sum(cashbackProgramTransactions.valorRestante) })
		.from(cashbackProgramTransactions)
		.where(
			and(
				eq(cashbackProgramTransactions.organizacaoId, userOrgId),
				eq(cashbackProgramTransactions.status, "ATIVO"),
				lte(cashbackProgramTransactions.expiracaoData, expiringDate),
			),
		);

	const currentGenerated = generatedResult[0]?.total ? Number(generatedResult[0].total) : 0;
	const currentRescued = rescuedResult[0]?.total ? Number(rescuedResult[0].total) : 0;
	const currentExpired = expiredResult[0]?.total ? Number(expiredResult[0].total) : 0;
	const currentExpiring = expiringResult[0]?.total ? Number(expiringResult[0].total) : 0;
	const currentParticipants = participantsResult[0]?.total ? Number(participantsResult[0].total) : 0;
	const currentNewParticipants = newParticipantsResult[0]?.total ? Number(newParticipantsResult[0].total) : 0;
	const currentRedemptionRate = currentGenerated > 0 ? (currentRescued / currentGenerated) * 100 : 0;

	// Calculate previous period stats
	const dateDiff = dayjs(input.period.before).diff(dayjs(input.period.after), "days");
	const previousPeriodAfter = dayjs(input.period.after).subtract(dateDiff, "days").toDate();
	const previousPeriodBefore = dayjs(input.period.before).subtract(dateDiff, "days").endOf("day").toDate();

	const [prevGeneratedResult, prevRescuedResult, prevExpiredResult, prevParticipantsResult, prevNewParticipantsResult] = await Promise.all([
		// Previous total cashback generated
		db
			.select({ total: sum(cashbackProgramTransactions.valor) })
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.organizacaoId, userOrgId),
					eq(cashbackProgramTransactions.tipo, "ACÚMULO"),
					gte(cashbackProgramTransactions.dataInsercao, previousPeriodAfter),
					lte(cashbackProgramTransactions.dataInsercao, previousPeriodBefore),
				),
			),
		// Previous total cashback rescued
		db
			.select({ total: sum(cashbackProgramTransactions.valor) })
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.organizacaoId, userOrgId),
					eq(cashbackProgramTransactions.tipo, "RESGATE"),
					gte(cashbackProgramTransactions.dataInsercao, previousPeriodAfter),
					lte(cashbackProgramTransactions.dataInsercao, previousPeriodBefore),
				),
			),
		// Previous total expired cashback
		db
			.select({ total: sum(cashbackProgramTransactions.valor) })
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.organizacaoId, userOrgId),
					eq(cashbackProgramTransactions.status, "EXPIRADO"),
					gte(cashbackProgramTransactions.dataInsercao, previousPeriodAfter),
					lte(cashbackProgramTransactions.dataInsercao, previousPeriodBefore),
				),
			),
		// Previous total participants
		db
			.select({ total: countDistinct(cashbackProgramBalances.clienteId) })
			.from(cashbackProgramBalances)
			.where(and(eq(cashbackProgramBalances.organizacaoId, userOrgId), lte(cashbackProgramBalances.dataInsercao, previousPeriodBefore))),
		// Previous total new participants
		db
			.select({ total: countDistinct(cashbackProgramBalances.clienteId) })
			.from(cashbackProgramBalances)
			.where(
				and(
					eq(cashbackProgramBalances.organizacaoId, userOrgId),
					gte(cashbackProgramBalances.dataInsercao, previousPeriodAfter),
					lte(cashbackProgramBalances.dataInsercao, previousPeriodBefore),
				),
			),
	]);

	const previousGenerated = prevGeneratedResult[0]?.total ? Number(prevGeneratedResult[0].total) : 0;
	const previousRescued = prevRescuedResult[0]?.total ? Number(prevRescuedResult[0].total) : 0;
	const previousExpired = prevExpiredResult[0]?.total ? Number(prevExpiredResult[0].total) : 0;
	const previousRedemptionRate = previousGenerated > 0 ? (previousRescued / previousGenerated) * 100 : 0;
	const previousParticipants = prevParticipantsResult[0]?.total ? Number(prevParticipantsResult[0].total) : 0;
	const previousNewParticipants = prevNewParticipantsResult[0]?.total ? Number(prevNewParticipantsResult[0].total) : 0;
	return {
		data: {
			totalParticipants: {
				atual: currentParticipants,
				anterior: previousParticipants,
			},
			totalNewParticipants: {
				atual: currentNewParticipants,
				anterior: previousNewParticipants,
			},
			totalCashbackGenerated: {
				atual: currentGenerated,
				anterior: previousGenerated,
			},
			totalCashbackRescued: {
				atual: currentRescued,
				anterior: previousRescued,
			},
			redemptionRate: {
				atual: currentRedemptionRate,
				anterior: previousRedemptionRate,
			},
			totalExpiredCashback: {
				atual: currentExpired,
				anterior: previousExpired,
			},
			totalExpiringCashback: {
				atual: currentExpiring,
				anterior: undefined, // Expiring is a snapshot, not period-based
			},
		},
	};
}

export type TCashbackProgramStatsOutput = Awaited<ReturnType<typeof getCashbackProgramStats>>;

const getCashbackProgramStatsRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = CashbackProgramStatsInputSchema.parse(payload);
	const result = await getCashbackProgramStats({ input, session: session.user });
	return NextResponse.json(result, { status: 200 });
};

export const POST = appApiHandler({
	POST: getCashbackProgramStatsRoute,
});
