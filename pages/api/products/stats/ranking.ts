import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { products, saleItems, sales } from "@/services/drizzle/schema";
import { and, desc, eq, gte, inArray, lte, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetProductsRankingInputSchema = z.object({
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
	rankingBy: z.enum(["sales-total-value", "sales-total-qty", "sales-total-margin"]).optional().nullable(),
});

export type TGetProductsRankingInput = z.infer<typeof GetProductsRankingInputSchema>;

async function fetchRankingForPeriod({
	periodAfter,
	periodBefore,
	rankingBy,
	userOrgId,
}: {
	periodAfter: Date | null;
	periodBefore: Date | null;
	rankingBy: "sales-total-value" | "sales-total-qty" | "sales-total-margin" | null | undefined;
	userOrgId: string;
}) {
	// Build sale conditions
	const saleConditions = [eq(sales.organizacaoId, userOrgId), eq(sales.natureza, "SN01")];
	if (periodAfter) saleConditions.push(gte(sales.dataVenda, periodAfter));
	if (periodBefore) saleConditions.push(lte(sales.dataVenda, periodBefore));

	// Get products with sales in the period - group by product ID only
	const productsWithSales = await db
		.select({
			produtoId: saleItems.produtoId,
			totalQuantity: sum(saleItems.quantidade),
			totalRevenue: sum(saleItems.valorVendaTotalLiquido),
			totalCost: sum(saleItems.valorCustoTotal),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(...saleConditions, eq(saleItems.organizacaoId, userOrgId)))
		.groupBy(saleItems.produtoId);

	// Get product IDs
	const productIds = productsWithSales.map((p) => p.produtoId);
	
	// Fetch product details separately
	const productsDetails = await db.query.products.findMany({
		where: and(eq(products.organizacaoId, userOrgId), inArray(products.id, productIds)),
		columns: {
			id: true,
			descricao: true,
			codigo: true,
			grupo: true,
			imagemCapaUrl: true,
		},
	});

	// Create a map for quick lookup
	const productsMap = new Map(productsDetails.map((product) => [product.id, product]));

	// Enrich products with sales metrics
	const productsWithMetrics = productsWithSales.map((productData) => {
		const productId = productData.produtoId;
		const productInfo = productsMap.get(productId);
		const totalRevenue = Number(productData.totalRevenue ?? 0);
		const totalCost = Number(productData.totalCost ?? 0);
		const totalMargin = totalRevenue - totalCost;
		const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

		return {
			produtoId: productId,
			descricao: productInfo?.descricao || "N/A",
			codigo: productInfo?.codigo || null,
			grupo: productInfo?.grupo || null,
			imagemCapaUrl: productInfo?.imagemCapaUrl || null,
			totalQuantity: Number(productData.totalQuantity ?? 0),
			totalRevenue,
			totalMargin,
			marginPercentage,
		};
	});

	// Sort by ranking criteria
	const sortedProducts = productsWithMetrics.sort((a, b) => {
		if (rankingBy === "sales-total-value") {
			return b.totalRevenue - a.totalRevenue;
		}
		if (rankingBy === "sales-total-qty") {
			return b.totalQuantity - a.totalQuantity;
		}
		if (rankingBy === "sales-total-margin") {
			return b.marginPercentage - a.marginPercentage;
		}
		// Default: sales-total-value
		return b.totalRevenue - a.totalRevenue;
	});

	// Get top 10 and add rank
	return sortedProducts.slice(0, 10).map((product, index) => ({
		rank: index + 1,
		...product,
	}));
}

async function getProductsRanking({ input, session }: { input: TGetProductsRankingInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET PRODUCTS RANKING] Starting:", {
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
				totalQuantityComparison: null,
				totalRevenueComparison: null,
				totalMarginComparison: null,
				marginPercentageComparison: null,
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

	// Create a map of produtoId -> comparison data for quick lookup
	const comparisonMap = new Map(
		comparisonRanking.map((item) => [
			item.produtoId,
			{
				rank: item.rank,
				totalQuantity: item.totalQuantity,
				totalRevenue: item.totalRevenue,
				totalMargin: item.totalMargin,
				marginPercentage: item.marginPercentage,
			},
		]),
	);

	// Merge current ranking with comparison data
	const enrichedRanking = currentRanking.map((item) => {
		const comparisonData = comparisonMap.get(item.produtoId);
		const rankComparison = comparisonData?.rank ?? null;
		const rankDelta = rankComparison !== null ? rankComparison - item.rank : null;

		return {
			...item,
			rankComparison,
			rankDelta,
			totalQuantityComparison: comparisonData?.totalQuantity ?? null,
			totalRevenueComparison: comparisonData?.totalRevenue ?? null,
			totalMarginComparison: comparisonData?.totalMargin ?? null,
			marginPercentageComparison: comparisonData?.marginPercentage ?? null,
		};
	});

	return {
		data: enrichedRanking,
	};
}

export type TGetProductsRankingOutput = Awaited<ReturnType<typeof getProductsRanking>>;

const getProductsRankingRoute: NextApiHandler<TGetProductsRankingOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	console.log("[INFO] [GET PRODUCTS RANKING] Starting:", {
		userOrg: sessionUser.membership?.organizacao.id,
		query: req.query,
	});
	const input = GetProductsRankingInputSchema.parse({
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
		comparingPeriodAfter: (req.query.comparingPeriodAfter as string | undefined) ?? null,
		comparingPeriodBefore: (req.query.comparingPeriodBefore as string | undefined) ?? null,
		rankingBy: (req.query.rankingBy as "sales-total-value" | "sales-total-qty" | "sales-total-margin" | undefined) ?? "sales-total-value",
	});

	const data = await getProductsRanking({ input, session: sessionUser });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getProductsRankingRoute,
});
