import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { goals, goalsSellers, sales, sellers } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, countDistinct, eq, gte, inArray, isNotNull, lte, or, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

const GetSellersOverallStatsInputSchema = z.object({
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
});

export type TGetSellersOverallStatsInput = z.infer<typeof GetSellersOverallStatsInputSchema>;

async function getTotalSellersGoal({
	periodAfter,
	periodBefore,
	organizacaoId,
}: {
	periodAfter: Date | null;
	periodBefore: Date | null;
	organizacaoId: string;
}): Promise<number> {
	if (!periodAfter || !periodBefore) return 0;

	const adjustedAfter = new Date(periodAfter);
	const adjustedBefore = new Date(periodBefore);

	// Get all sellers in organization
	const allSellers = await db.query.sellers.findMany({
		where: eq(sellers.organizacaoId, organizacaoId),
		columns: {
			id: true,
		},
	});

	let totalGoal = 0;

	// Calculate goal for each seller
	for (const seller of allSellers) {
		const sellerGoalsResult = await db.query.goalsSellers.findMany({
			where: and(
				eq(goalsSellers.vendedorId, seller.id),
				inArray(
					goalsSellers.metaId,
					db
						.select({ id: goals.id })
						.from(goals)
						.where(
							and(
								eq(goals.organizacaoId, organizacaoId),
								or(
									and(gte(goals.dataInicio, adjustedAfter), lte(goals.dataInicio, adjustedBefore)),
									and(gte(goals.dataFim, adjustedAfter), lte(goals.dataFim, adjustedBefore)),
								),
							),
						),
				),
			),
			with: {
				meta: {
					columns: {
						dataInicio: true,
						dataFim: true,
					},
				},
			},
		});

		const sellerGoal = sellerGoalsResult.reduce((acc, goal) => {
			const afterDatetime = adjustedAfter.getTime();
			const beforeDatetime = adjustedBefore.getTime();

			const monthStartDatetime = new Date(goal.meta.dataInicio).getTime();
			const monthEndDatetime = new Date(goal.meta.dataFim).getTime();

			const days = Math.abs(dayjs(goal.meta.dataFim).diff(dayjs(goal.meta.dataInicio), "days")) + 1;

			if (
				(afterDatetime < monthStartDatetime && beforeDatetime < monthStartDatetime) ||
				(afterDatetime > monthEndDatetime && beforeDatetime > monthEndDatetime)
			) {
				return acc;
			}
			if (afterDatetime <= monthStartDatetime && beforeDatetime >= monthEndDatetime) {
				return acc + goal.objetivoValor;
			}
			if (beforeDatetime > monthEndDatetime) {
				const applicableDays = dayjs(goal.meta.dataFim).diff(dayjs(adjustedAfter), "days");
				return acc + (goal.objetivoValor * applicableDays) / days;
			}

			const applicableDays = dayjs(adjustedBefore).diff(dayjs(goal.meta.dataInicio), "days") + 1;
			return acc + (goal.objetivoValor * applicableDays) / days;
		}, 0);

		totalGoal += sellerGoal;
	}

	return totalGoal;
}

async function getSellersOverallStats({ input, session }: { input: TGetSellersOverallStatsInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET SELLERS OVERALL STATS] Starting:", {
		userOrg: userOrgId,
		input,
	});

	const { periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore } = input;

	// 1. Total sellers count (all sellers in organization)
	const totalSellersResult = await db.select({ count: count() }).from(sellers).where(eq(sellers.organizacaoId, userOrgId));

	// 2. Active sellers (sellers who made sales in the period)
	const saleConditions = [eq(sales.organizacaoId, userOrgId), isNotNull(sales.dataVenda)];
	if (periodAfter) saleConditions.push(gte(sales.dataVenda, periodAfter));
	if (periodBefore) saleConditions.push(lte(sales.dataVenda, periodBefore));

	const activeSellersResult = await db
		.select({ count: countDistinct(sales.vendedorId) })
		.from(sales)
		.where(and(...saleConditions));

	// 3. Total revenue and sales count
	const revenueResult = await db
		.select({
			totalRevenue: sum(sales.valorTotal),
			salesCount: count(sales.id),
		})
		.from(sales)
		.where(and(...saleConditions));

	const totalRevenue = Number(revenueResult[0]?.totalRevenue ?? 0);
	const salesCount = Number(revenueResult[0]?.salesCount ?? 0);
	const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

	// 4. Total goal
	const totalGoal = await getTotalSellersGoal({
		periodAfter: periodAfter ?? null,
		periodBefore: periodBefore ?? null,
		organizacaoId: userOrgId,
	});
	const goalAchievementPercentage = totalGoal > 0 ? (totalRevenue / totalGoal) * 100 : 0;

	// If no comparison period, return current stats only
	if (!comparingPeriodAfter && !comparingPeriodBefore) {
		return {
			data: {
				totalSellers: {
					current: totalSellersResult[0]?.count ?? 0,
					comparison: null,
				},
				activeSellers: {
					current: Number(activeSellersResult[0]?.count ?? 0),
					comparison: null,
				},
				totalRevenue: {
					current: totalRevenue,
					comparison: null,
				},
				averageTicket: {
					current: averageTicket,
					comparison: null,
				},
				goalAchievement: {
					current: goalAchievementPercentage,
					comparison: null,
				},
			},
		};
	}

	// Calculate comparison period stats
	const comparisonSaleConditions = [eq(sales.organizacaoId, userOrgId), isNotNull(sales.dataVenda)];
	if (comparingPeriodAfter) comparisonSaleConditions.push(gte(sales.dataVenda, comparingPeriodAfter));
	if (comparingPeriodBefore) comparisonSaleConditions.push(lte(sales.dataVenda, comparingPeriodBefore));

	const comparisonTotalSellersResult = await db.select({ count: count() }).from(sellers).where(eq(sellers.organizacaoId, userOrgId));

	const comparisonActiveSellersResult = await db
		.select({ count: countDistinct(sales.vendedorId) })
		.from(sales)
		.where(and(...comparisonSaleConditions));

	const comparisonRevenueResult = await db
		.select({
			totalRevenue: sum(sales.valorTotal),
			salesCount: count(sales.id),
		})
		.from(sales)
		.where(and(...comparisonSaleConditions));

	const comparisonTotalRevenue = Number(comparisonRevenueResult[0]?.totalRevenue ?? 0);
	const comparisonSalesCount = Number(comparisonRevenueResult[0]?.salesCount ?? 0);
	const comparisonAverageTicket = comparisonSalesCount > 0 ? comparisonTotalRevenue / comparisonSalesCount : 0;

	const comparisonTotalGoal = await getTotalSellersGoal({
		periodAfter: comparingPeriodAfter ?? null,
		periodBefore: comparingPeriodBefore ?? null,
		organizacaoId: userOrgId,
	});
	const comparisonGoalAchievementPercentage = comparisonTotalGoal > 0 ? (comparisonTotalRevenue / comparisonTotalGoal) * 100 : 0;

	return {
		data: {
			totalSellers: {
				current: totalSellersResult[0]?.count ?? 0,
				comparison: comparisonTotalSellersResult[0]?.count ?? 0,
			},
			activeSellers: {
				current: Number(activeSellersResult[0]?.count ?? 0),
				comparison: Number(comparisonActiveSellersResult[0]?.count ?? 0),
			},
			totalRevenue: {
				current: totalRevenue,
				comparison: comparisonTotalRevenue,
			},
			averageTicket: {
				current: averageTicket,
				comparison: comparisonAverageTicket,
			},
			goalAchievement: {
				current: goalAchievementPercentage,
				comparison: comparisonGoalAchievementPercentage,
			},
		},
	};
}

export type TGetSellersOverallStatsOutput = Awaited<ReturnType<typeof getSellersOverallStats>>;

const getSellersOverallStatsRoute: NextApiHandler<TGetSellersOverallStatsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetSellersOverallStatsInputSchema.parse(req.query);
	const data = await getSellersOverallStats({ input, session: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getSellersOverallStatsRoute,
});
