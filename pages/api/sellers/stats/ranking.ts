import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { goals, goalsSellers, sales, sellers } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gte, inArray, isNotNull, lte, or, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetSellersRankingInputSchema = z.object({
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
			required_error: "Período de comparação não informado.",
			invalid_type_error: "Tipo inválido para período de comparação.",
		})
		.datetime({ message: "Tipo inválido para período de comparação." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodBefore: z
		.string({
			required_error: "Período de comparação não informado.",
			invalid_type_error: "Tipo inválido para período de comparação.",
		})
		.datetime({ message: "Tipo inválido para período de comparação." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	rankingBy: z.enum(["sales-total-value", "sales-total-qty", "average-ticket", "goal-achievement"]).optional().nullable(),
});

export type TGetSellersRankingInput = z.infer<typeof GetSellersRankingInputSchema>;

async function getSellerSaleGoal({
	sellerId,
	periodAfter,
	periodBefore,
	organizacaoId,
}: {
	sellerId: string;
	periodAfter: Date | null;
	periodBefore: Date | null;
	organizacaoId: string;
}): Promise<number> {
	if (!periodAfter || !periodBefore) return 0;

	const adjustedAfter = new Date(periodAfter);
	const adjustedBefore = new Date(periodBefore);

	const sellerGoalsResult = await db.query.goalsSellers.findMany({
		where: and(
			eq(goalsSellers.vendedorId, sellerId),
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

	const totalSellerGoal = sellerGoalsResult.reduce((acc, goal) => {
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

	return totalSellerGoal;
}

async function fetchRankingForPeriod({
	periodAfter,
	periodBefore,
	rankingBy,
	userOrgId,
}: {
	periodAfter: Date | null;
	periodBefore: Date | null;
	rankingBy: "sales-total-value" | "sales-total-qty" | "average-ticket" | "goal-achievement" | null | undefined;
	userOrgId: string;
}) {
	// Build sale conditions (org and valid sales only (SNO1))
	const saleConditions = [eq(sales.organizacaoId, userOrgId), isNotNull(sales.dataVenda), isNotNull(sales.vendedorId), eq(sales.natureza, "SN01")];
	if (periodAfter) saleConditions.push(gte(sales.dataVenda, periodAfter));
	if (periodBefore) saleConditions.push(lte(sales.dataVenda, periodBefore));

	// Get sellers with sales in the period
	const sellersWithSales = await db
		.select({
			vendedorId: sales.vendedorId,
			totalRevenue: sum(sales.valorTotal),
			totalSalesQty: count(sales.id),
		})
		.from(sales)
		.where(and(...saleConditions))
		.groupBy(sales.vendedorId);

	// Get seller details
	const sellerIds = sellersWithSales.map((s) => s.vendedorId).filter((id): id is string => id !== null);
	const sellersDetails = await db.query.sellers.findMany({
		where: and(eq(sellers.organizacaoId, userOrgId), inArray(sellers.id, sellerIds)),
		columns: {
			id: true,
			nome: true,
			avatarUrl: true,
		},
	});

	const sellersMap = new Map(sellersDetails.map((seller) => [seller.id, seller]));

	// Calculate metrics for each seller including goals
	const sellersWithMetrics = await Promise.all(
		sellersWithSales.map(async (sellerData) => {
			const sellerId = sellerData.vendedorId as string;
			const sellerInfo = sellersMap.get(sellerId);
			const totalRevenue = Number(sellerData.totalRevenue ?? 0);
			const totalSalesQty = Number(sellerData.totalSalesQty ?? 0);
			const averageTicket = totalSalesQty > 0 ? totalRevenue / totalSalesQty : 0;

			// Get seller goal
			const goalValue = await getSellerSaleGoal({
				sellerId,
				periodAfter: periodAfter ?? null,
				periodBefore: periodBefore ?? null,
				organizacaoId: userOrgId,
			});
			const goalAchievementPercentage = goalValue > 0 ? (totalRevenue / goalValue) * 100 : 0;

			return {
				vendedorId: sellerId,
				vendedorNome: sellerInfo?.nome || "N/A",
				vendedorAvatarUrl: sellerInfo?.avatarUrl || null,
				totalRevenue,
				totalSalesQty,
				averageTicket,
				goalValue,
				goalAchievementPercentage,
			};
		}),
	);

	// Sort by ranking criteria
	const sortedSellers = sellersWithMetrics.sort((a, b) => {
		if (rankingBy === "sales-total-value") {
			return b.totalRevenue - a.totalRevenue;
		}
		if (rankingBy === "sales-total-qty") {
			return b.totalSalesQty - a.totalSalesQty;
		}
		if (rankingBy === "average-ticket") {
			return b.averageTicket - a.averageTicket;
		}
		if (rankingBy === "goal-achievement") {
			return b.goalAchievementPercentage - a.goalAchievementPercentage;
		}
		// Default: sales-total-value
		return b.totalRevenue - a.totalRevenue;
	});

	// Get top 10 and add rank
	return sortedSellers.slice(0, 10).map((seller, index) => ({
		rank: index + 1,
		vendedorId: seller.vendedorId,
		vendedorNome: seller.vendedorNome,
		vendedorAvatarUrl: seller.vendedorAvatarUrl,
		totalRevenue: seller.totalRevenue,
		totalSalesQty: seller.totalSalesQty,
		averageTicket: seller.averageTicket,
		goalValue: seller.goalValue,
		goalAchievementPercentage: seller.goalAchievementPercentage,
	}));
}

async function getSellersRanking({ input, session }: { input: TGetSellersRankingInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET SELLERS RANKING] Starting:", {
		userOrg: userOrgId,
		input,
	});

	const { periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore, rankingBy } = input;

	// Fetch current period ranking
	const currentRanking = await fetchRankingForPeriod({
		periodAfter,
		periodBefore,
		rankingBy,
		userOrgId,
	});

	// If no comparison period, return current ranking without comparison fields
	if (!comparingPeriodAfter || !comparingPeriodBefore) {
		return {
			data: currentRanking.map((item) => ({
				...item,
				rankComparison: null,
				rankDelta: null,
				totalRevenueComparison: null,
				totalSalesQtyComparison: null,
				averageTicketComparison: null,
				goalAchievementPercentageComparison: null,
			})),
		};
	}

	// Fetch comparison period ranking
	const comparisonRanking = await fetchRankingForPeriod({
		periodAfter: comparingPeriodAfter,
		periodBefore: comparingPeriodBefore,
		rankingBy,
		userOrgId,
	});

	// Create a map of vendedorId -> comparison data for quick lookup
	const comparisonMap = new Map(
		comparisonRanking.map((item) => [
			item.vendedorId,
			{
				rank: item.rank,
				totalRevenue: item.totalRevenue,
				totalSalesQty: item.totalSalesQty,
				averageTicket: item.averageTicket,
				goalAchievementPercentage: item.goalAchievementPercentage,
			},
		]),
	);

	// Merge current ranking with comparison data
	const enrichedRanking = currentRanking.map((item) => {
		const comparisonData = comparisonMap.get(item.vendedorId);
		const rankComparison = comparisonData?.rank ?? null;
		const rankDelta = rankComparison !== null ? rankComparison - item.rank : null;

		return {
			...item,
			rankComparison,
			rankDelta,
			totalRevenueComparison: comparisonData?.totalRevenue ?? null,
			totalSalesQtyComparison: comparisonData?.totalSalesQty ?? null,
			averageTicketComparison: comparisonData?.averageTicket ?? null,
			goalAchievementPercentageComparison: comparisonData?.goalAchievementPercentage ?? null,
		};
	});

	return {
		data: enrichedRanking,
	};
}

export type TGetSellersRankingOutput = Awaited<ReturnType<typeof getSellersRanking>>;

const getSellersRankingRoute: NextApiHandler<TGetSellersRankingOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetSellersRankingInputSchema.parse({
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
		comparingPeriodAfter: (req.query.comparingPeriodAfter as string | undefined) ?? null,
		comparingPeriodBefore: (req.query.comparingPeriodBefore as string | undefined) ?? null,
		rankingBy:
			(req.query.rankingBy as "sales-total-value" | "sales-total-qty" | "average-ticket" | "goal-achievement" | undefined) ?? "sales-total-value",
	});

	const data = await getSellersRanking({ input, session: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getSellersRankingRoute,
});
