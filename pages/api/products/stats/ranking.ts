import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { products, saleItems, sales } from "@/services/drizzle/schema";
import { and, desc, eq, gte, inArray, lte, notInArray, sql, sum } from "drizzle-orm";
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
	saleNatures: z
		.array(
			z.string({
				invalid_type_error: "Tipo inválido para natureza de venda.",
			}),
		)
		.optional()
		.nullable(),
	excludedSalesIds: z
		.array(
			z.string({
				invalid_type_error: "Tipo inválido para ID da venda.",
			}),
		)
		.optional()
		.nullable(),
	totalMin: z
		.number({
			invalid_type_error: "Tipo inválido para valor mínimo da venda.",
		})
		.optional()
		.nullable(),
	totalMax: z
		.number({
			invalid_type_error: "Tipo inválido para valor máximo da venda.",
		})
		.optional()
		.nullable(),
	rankingBy: z.enum(["sales-total-value", "sales-total-qty", "sales-total-margin"]).optional().nullable(),
});

export type TGetProductsRankingInput = z.infer<typeof GetProductsRankingInputSchema>;

async function getProductsRanking({ input, session }: { input: TGetProductsRankingInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET PRODUCTS RANKING] Starting:", {
		userOrg: userOrgId,
		input,
	});

	const { periodAfter, periodBefore, saleNatures, excludedSalesIds, totalMin, totalMax, rankingBy } = input;

	// Build sale conditions
	const saleConditions = [eq(sales.organizacaoId, userOrgId)];
	if (periodAfter) saleConditions.push(gte(sales.dataVenda, periodAfter));
	if (periodBefore) saleConditions.push(lte(sales.dataVenda, periodBefore));
	if (saleNatures && saleNatures.length > 0) saleConditions.push(inArray(sales.natureza, saleNatures));
	if (excludedSalesIds && excludedSalesIds.length > 0) saleConditions.push(notInArray(sales.id, excludedSalesIds));
	if (totalMin) saleConditions.push(gte(sales.valorTotal, totalMin));
	if (totalMax) saleConditions.push(lte(sales.valorTotal, totalMax));

	// Get top products based on ranking criteria
	const ranking = await db
		.select({
			produtoId: saleItems.produtoId,
			produtoDescricao: products.descricao,
			produtoCodigo: products.codigo,
			produtoGrupo: products.grupo,
			produtoImagemCapaUrl: products.imagemCapaUrl,
			totalQuantity: sum(saleItems.quantidade),
			totalRevenue: sum(saleItems.valorVendaTotalLiquido),
			totalCost: sum(saleItems.valorCustoTotal),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.innerJoin(products, eq(saleItems.produtoId, products.id))
		.where(and(...saleConditions, eq(saleItems.organizacaoId, userOrgId), eq(products.organizacaoId, userOrgId)))
		.groupBy(saleItems.produtoId, products.descricao, products.codigo, products.grupo, products.imagemCapaUrl)
		.limit(10);

	const formattedRanking = ranking
		.map((item, index) => {
			const totalRevenue = Number(item.totalRevenue ?? 0);
			const totalCost = Number(item.totalCost ?? 0);
			const totalMargin = totalRevenue - totalCost;
			const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

			return {
				produtoId: item.produtoId,
				descricao: item.produtoDescricao,
				codigo: item.produtoCodigo,
				grupo: item.produtoGrupo,
				imagemCapaUrl: item.produtoImagemCapaUrl,
				totalQuantity: Number(item.totalQuantity ?? 0),
				totalRevenue,
				totalMargin,
				marginPercentage,
			};
		})
		.sort((a, b) => {
			if (rankingBy === "sales-total-value") {
				return b.totalRevenue - a.totalRevenue;
			}
			if (rankingBy === "sales-total-qty") {
				return b.totalQuantity - a.totalQuantity;
			}
			if (rankingBy === "sales-total-margin") {
				return b.totalMargin - a.totalMargin;
			}
			return 0;
		})
		.map((item, index) => ({
			rank: index + 1,
			...item,
		}));

	return {
		data: formattedRanking,
	};
}

export type TGetProductsRankingOutput = Awaited<ReturnType<typeof getProductsRanking>>;

const getProductsRankingRoute: NextApiHandler<TGetProductsRankingOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetProductsRankingInputSchema.parse({
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
		saleNatures: req.query.saleNatures ? (req.query.saleNatures as string).split(",") : null,
		excludedSalesIds: req.query.excludedSalesIds ? (req.query.excludedSalesIds as string).split(",") : null,
		totalMin: req.query.totalMin ? Number(req.query.totalMin) : null,
		totalMax: req.query.totalMax ? Number(req.query.totalMax) : null,
		rankingBy: (req.query.rankingBy as "sales-total-value" | "sales-total-qty" | "sales-total-margin" | undefined) ?? "sales-total-value",
	});

	const data = await getProductsRanking({ input, session: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getProductsRankingRoute,
});
