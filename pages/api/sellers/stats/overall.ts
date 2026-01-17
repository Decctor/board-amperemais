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

type GetOverallSaleGoalProps = {
	after: string;
	before: string;
	organizacaoId: string;
};
async function getOverallSaleGoal({ after, before, organizacaoId }: GetOverallSaleGoalProps) {
	const ajustedAfter = dayjs(after).toDate();
	const ajustedBefore = dayjs(before).endOf("day").toDate();
	try {
		const goals = await db.query.goals.findMany({
			where: (fields, { and, or, gte, lte, eq }) =>
				and(
					eq(fields.organizacaoId, organizacaoId),
					or(
						and(gte(fields.dataInicio, ajustedAfter), lte(fields.dataInicio, ajustedBefore)),
						and(gte(fields.dataFim, ajustedAfter), lte(fields.dataFim, ajustedBefore)),
					),
				),
		});

		console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goals: ", goals);
		const applicableSaleGoal = goals.reduce((acc, current) => {
			const afterDatetime = new Date(after).getTime();
			const beforeDatetime = new Date(before).getTime();

			const monthStartDatetime = new Date(current.dataInicio).getTime();
			const monthEndDatetime = new Date(current.dataFim).getTime();

			const days = Math.abs(dayjs(current.dataFim).diff(dayjs(current.dataInicio), "days")) + 1;

			if (
				(afterDatetime < monthStartDatetime && beforeDatetime < monthStartDatetime) ||
				(afterDatetime > monthEndDatetime && beforeDatetime > monthEndDatetime)
			) {
				console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goal not applicable: ", { current });
				return acc;
			}
			if (afterDatetime <= monthStartDatetime && beforeDatetime >= monthEndDatetime) {
				// Caso o período de filtro da query compreenda o mês inteiro
				console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goal applicable for all period: ", { current });
				return acc + current.objetivoValor;
			}
			if (beforeDatetime > monthEndDatetime) {
				const applicableDays = dayjs(current.dataFim).diff(dayjs(after), "days");

				console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goal applicable for partial period: ", { current, applicableDays, days });
				return acc + (current.objetivoValor * applicableDays) / days;
			}

			const applicableDays = dayjs(before).diff(dayjs(current.dataInicio), "days") + 1;

			console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goal applicable for partial period: ", { current, applicableDays, days });

			return acc + (current.objetivoValor * applicableDays) / days;
		}, 0);

		return applicableSaleGoal;
	} catch (error) {
		console.log("Error getting overall sale goal", error);
		throw error;
	}
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
	const saleConditions = [eq(sales.organizacaoId, userOrgId), isNotNull(sales.dataVenda), eq(sales.natureza, "SN01")];
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
	const totalGoal =
		periodAfter && periodBefore
			? await getOverallSaleGoal({
					after: periodAfter?.toISOString(),
					before: periodBefore?.toISOString(),
					organizacaoId: userOrgId,
				})
			: 0;
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
	const comparisonSaleConditions = [eq(sales.organizacaoId, userOrgId), isNotNull(sales.dataVenda), eq(sales.natureza, "SN01")];
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

	const comparisonTotalGoal =
		comparingPeriodAfter && comparingPeriodBefore
			? await getOverallSaleGoal({
					after: comparingPeriodAfter?.toISOString(),
					before: comparingPeriodBefore?.toISOString(),
					organizacaoId: userOrgId,
				})
			: 0;
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
