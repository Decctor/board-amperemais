import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { products, saleItems, sales } from "@/services/drizzle/schema";
import { and, count, countDistinct, eq, gte, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

const GetProductsOverallStatsInputSchema = z.object({
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

export type TGetProductsOverallStatsInput = z.infer<typeof GetProductsOverallStatsInputSchema>;

async function getProductsOverallStats({ input, session }: { input: TGetProductsOverallStatsInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET PRODUCTS STATS] Starting:", {
		userOrg: userOrgId,
		input,
	});

	const { periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore } = input;

	// 1. Total products count (all products in organization)
	const totalProductsResult = await db.select({ count: count() }).from(products).where(eq(products.organizacaoId, userOrgId));

	// 2. Active products (products sold in the period)
	const saleConditions = [eq(sales.organizacaoId, userOrgId)];
	if (periodAfter) saleConditions.push(gte(sales.dataVenda, periodAfter));
	if (periodBefore) saleConditions.push(lte(sales.dataVenda, periodBefore));

	const activeProductsResult = await db
		.select({ count: countDistinct(saleItems.produtoId) })
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), ...saleConditions));

	// 3. Total revenue (sum of valorVendaTotalLiquido)
	const revenueResult = await db
		.select({
			totalRevenue: sum(saleItems.valorVendaTotalLiquido),
			totalCost: sum(saleItems.valorCustoTotal),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), ...saleConditions));

	const totalRevenue = Number(revenueResult[0]?.totalRevenue ?? 0);
	const totalCost = Number(revenueResult[0]?.totalCost ?? 0);
	const totalMargin = totalRevenue - totalCost;
	const averageMarginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

	// If no comparison period, return current stats only
	if (!comparingPeriodAfter && !comparingPeriodBefore) {
		return {
			data: {
				totalProducts: {
					current: totalProductsResult[0]?.count ?? 0,
					comparison: null,
				},
				activeProducts: {
					current: Number(activeProductsResult[0]?.count ?? 0),
					comparison: null,
				},
				totalRevenue: {
					current: totalRevenue,
					comparison: null,
				},
				averageMargin: {
					current: averageMarginPercentage,
					comparison: null,
				},
			},
		};
	}

	// Calculate comparison period stats
	const comparisonSaleConditions = [eq(sales.organizacaoId, userOrgId)];
	if (comparingPeriodAfter) comparisonSaleConditions.push(gte(sales.dataVenda, comparingPeriodAfter));
	if (comparingPeriodBefore) comparisonSaleConditions.push(lte(sales.dataVenda, comparingPeriodBefore));

	const comparisonTotalProductsResult = await db.select({ count: count() }).from(products).where(eq(products.organizacaoId, userOrgId));

	const comparisonActiveProductsResult = await db
		.select({ count: countDistinct(saleItems.produtoId) })
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), ...comparisonSaleConditions));

	const comparisonRevenueResult = await db
		.select({
			totalRevenue: sum(saleItems.valorVendaTotalLiquido),
			totalCost: sum(saleItems.valorCustoTotal),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), ...comparisonSaleConditions));

	const comparisonTotalRevenue = Number(comparisonRevenueResult[0]?.totalRevenue ?? 0);
	const comparisonTotalCost = Number(comparisonRevenueResult[0]?.totalCost ?? 0);
	const comparisonTotalMargin = comparisonTotalRevenue - comparisonTotalCost;
	const comparisonAverageMarginPercentage = comparisonTotalRevenue > 0 ? (comparisonTotalMargin / comparisonTotalRevenue) * 100 : 0;

	return {
		data: {
			totalProducts: {
				current: totalProductsResult[0]?.count ?? 0,
				comparison: comparisonTotalProductsResult[0]?.count ?? 0,
			},
			activeProducts: {
				current: Number(activeProductsResult[0]?.count ?? 0),
				comparison: Number(comparisonActiveProductsResult[0]?.count ?? 0),
			},
			totalRevenue: {
				current: totalRevenue,
				comparison: comparisonTotalRevenue,
			},
			averageMargin: {
				current: averageMarginPercentage,
				comparison: comparisonAverageMarginPercentage,
			},
		},
	};
}

export type TGetProductsOverallStatsOutput = Awaited<ReturnType<typeof getProductsOverallStats>>;

const getProductsOverallStatsRoute: NextApiHandler<TGetProductsOverallStatsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetProductsOverallStatsInputSchema.parse(req.query);
	const data = await getProductsOverallStats({ input, session: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getProductsOverallStatsRoute,
});
