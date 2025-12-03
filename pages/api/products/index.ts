import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { ProductSchema } from "@/schemas/products";
import { db } from "@/services/drizzle";
import { partners, products, saleItems, sales } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, gte, inArray, lte, max, min, notInArray, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetProductsDefaultInputSchema = z.object({
	page: z
		.string({
			required_error: "Página não informada.",
			invalid_type_error: "Tipo inválido para página.",
		})
		.transform((val) => Number(val)),

	search: z
		.string({
			required_error: "Busca não informada.",
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
	groups: z
		.string({
			required_error: "Grupos não informados.",
			invalid_type_error: "Tipo inválido para grupo.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val.split(",") : [])),
	statsPeriodBefore: z
		.string({ invalid_type_error: "Tipo não válido para data de venda antes da data." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsPeriodAfter: z
		.string({ invalid_type_error: "Tipo não válido para data de venda após a data." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsSaleNatures: z
		.string({
			invalid_type_error: "Tipo não válido para natureza de venda.",
		})
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	statsExcludedSalesIds: z
		.string({
			invalid_type_error: "Tipo não válido para ID da venda.",
		})
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	statsTotalMin: z
		.string({
			invalid_type_error: "Tipo não válido para valor mínimo da venda.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
	statsTotalMax: z
		.string({
			invalid_type_error: "Tipo não válido para valor máximo da venda.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
	orderByField: z.enum(["descricao", "codigo", "grupo", "vendasValorTotal", "vendasQtdeTotal"]).optional().nullable(),
	orderByDirection: z.enum(["asc", "desc"]).optional().nullable(),
});
export type TGetProductsDefaultInput = z.infer<typeof GetProductsDefaultInputSchema>;

const GetProductsByIdInputSchema = z.object({
	id: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo inválido para ID do produto.",
		})
		.uuid({ message: "ID do produto inválido." }),
});
export type TGetProductsByIdInput = z.infer<typeof GetProductsByIdInputSchema>;

const GetProductsInputSchema = z.union([GetProductsByIdInputSchema, GetProductsDefaultInputSchema]);
export type TGetProductsInput = z.infer<typeof GetProductsInputSchema>;

type GetProductsParams = {
	input: TGetProductsInput;
	user: TAuthUserSession["user"];
};

async function getProducts({ input, user }: GetProductsParams) {
	console.log("[INFO] [GET PRODUCTS] Input:", input);

	if ("id" in input) {
		console.log("[INFO] [GET PRODUCTS] Getting product by id:", input.id);
		const product = await db.query.products.findFirst({
			where: (fields, { eq }) => eq(fields.id, input.id),
		});
		if (!product) throw new createHttpError.NotFound("Produto não encontrado.");

		return {
			data: {
				byId: product,
				default: undefined,
			},
		};
	}

	const productQueryConditions = [];
	if (input.search) {
		productQueryConditions.push(
			sql`(${products.descricao} ILIKE '%' || ${input.search} || '%' OR ${products.codigo} ILIKE '%' || ${input.search} || '%')`,
		);
	}
	if (input.groups.length > 0) {
		productQueryConditions.push(inArray(products.grupo, input.groups));
	}

	const statsConditions = [];
	if (input.statsPeriodBefore) statsConditions.push(lte(sales.dataVenda, input.statsPeriodBefore));
	if (input.statsPeriodAfter) statsConditions.push(gte(sales.dataVenda, input.statsPeriodAfter));
	if (input.statsSaleNatures && input.statsSaleNatures.length > 0) statsConditions.push(inArray(sales.natureza, input.statsSaleNatures));
	if (input.statsExcludedSalesIds && input.statsExcludedSalesIds.length > 0) statsConditions.push(notInArray(sales.id, input.statsExcludedSalesIds));
	if (input.statsTotalMin) statsConditions.push(gte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMin));
	if (input.statsTotalMax) statsConditions.push(lte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMax));

	const havingConditions = [];
	if (input.statsTotalMin) havingConditions.push(gte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMin));
	if (input.statsTotalMax) havingConditions.push(lte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMax));

	let orderByClause = asc(products.descricao);
	const direction = input.orderByDirection === "desc" ? desc : asc;
	switch (input.orderByField) {
		case "descricao":
			orderByClause = direction(products.descricao);
			break;
		case "codigo":
			orderByClause = direction(products.codigo);
			break;
		case "grupo":
			orderByClause = direction(products.grupo);
			break;
		case "vendasValorTotal":
			orderByClause = direction(sql`COALESCE(sum(${saleItems.valorVendaTotalLiquido}), 0)`);
			break;
		case "vendasQtdeTotal":
			orderByClause = direction(count(sales.id));
			break;
		default:
			orderByClause = asc(products.descricao);
			break;
	}

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (input.page - 1);

	const matchedSubquery = db
		.select({
			productId: products.id,
		})
		.from(products)
		.leftJoin(saleItems, eq(products.id, saleItems.produtoId))
		.leftJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(...productQueryConditions, ...statsConditions))
		.groupBy(products.id);

	if (havingConditions.length > 0) {
		matchedSubquery.having(and(...havingConditions));
	}
	const statsByProductMatchedCountResult = await db.select({ count: count() }).from(matchedSubquery.as("sq"));
	const statsByProductMatchedCount = statsByProductMatchedCountResult[0]?.count ?? 0;

	// Crie um fragmento SQL reutilizável para o valor total (trata NULL como 0)
	const totalSalesSql = sql`COALESCE(sum(${saleItems.valorVendaTotalLiquido}), 0)`;

	const statsByProductResult = await db
		.select({
			productId: products.id,
			totalSalesValue: sum(saleItems.valorVendaTotalLiquido),
			totalSalesQty: count(sales.id),
			firstSaleDate: min(sales.dataVenda),
			lastSaleDate: max(sales.dataVenda),
			// Calcula o acumulado ordenado por valor decrescente
			accumulatedSales: sql<number>`sum(${totalSalesSql}) OVER (ORDER BY ${totalSalesSql} DESC)`,
			// Calcula o total geral do conjunto filtrado
			totalSalesGlobal: sql<number>`sum(${totalSalesSql}) OVER ()`,
		})
		.from(products)
		.leftJoin(saleItems, eq(products.id, saleItems.produtoId))
		.leftJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(...productQueryConditions, ...statsConditions))
		.having(and(...havingConditions))
		.groupBy(products.id)
		.orderBy(orderByClause)
		.offset(skip)
		.limit(PAGE_SIZE);

	const productIds = statsByProductResult.map((product) => product.productId);
	const productsResult = await db.query.products.findMany({
		where: inArray(products.id, productIds),
	});

	const productsMap = new Map(productsResult.map((p) => [p.id, p]));
	const productsWithStats = statsByProductResult
		.map((stats) => {
			const product = productsMap.get(stats.productId);
			if (!product) return null;

			// Lógica da Curva ABC
			const totalSales = stats.totalSalesValue ? Number(stats.totalSalesValue) : 0;
			const accumulated = Number(stats.accumulatedSales);
			const globalTotal = Number(stats.totalSalesGlobal);

			let curvaABC = "C";
			if (globalTotal > 0) {
				// Descobre onde este item "começa" na curva acumulada
				// Se o item anterior terminou em 79%, e este vai até 82%, ele ainda entra como A (crossover)
				const prevAccumulated = accumulated - totalSales;
				const prevPercentage = prevAccumulated / globalTotal;

				if (prevPercentage < 0.8) curvaABC = "A";
				else if (prevPercentage < 0.95) curvaABC = "B";
			}

			return {
				...product,
				estatisticas: {
					vendasValorTotal: totalSales,
					vendasQtdeTotal: stats?.totalSalesQty ? Number(stats.totalSalesQty) : 0,
					dataPrimeiraVenda: stats?.firstSaleDate ? stats.firstSaleDate : null,
					dataUltimaVenda: stats?.lastSaleDate ? stats.lastSaleDate : null,
					curvaABC: curvaABC, // Novo campo
				},
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
	return {
		data: {
			default: {
				products: productsWithStats,
				productsMatched: statsByProductMatchedCount,
				totalPages: Math.ceil(statsByProductMatchedCount / PAGE_SIZE),
			},
			byId: undefined,
		},
	};
}

export type TGetProductsOutput = Awaited<ReturnType<typeof getProducts>>;
export type TGetProductsOutputDefault = Exclude<TGetProductsOutput["data"]["default"], undefined>;
export type TGetProductsOutputById = Exclude<TGetProductsOutput["data"]["byId"], undefined>;

const getProductsHandler: NextApiHandler<TGetProductsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	console.log("[INFO] [GET PRODUCTS] Query params:", req.query);
	const input = GetProductsInputSchema.parse({
		page: req.query.page as string | undefined,
		id: req.query.id as string | undefined,
		search: req.query.search as string | undefined,
		groups: req.query.groups as string | undefined,
		statsPeriodAfter: req.query.statsPeriodAfter as string | undefined,
		statsPeriodBefore: req.query.statsPeriodBefore as string | undefined,
		statsSaleNatures: req.query.statsSaleNatures as string | undefined,
		statsExcludedSalesIds: req.query.statsExcludedSalesIds as string | undefined,
		statsTotalMin: req.query.statsTotalMin as string | undefined,
		statsTotalMax: req.query.statsTotalMax as string | undefined,
		orderByField: req.query.orderByField as string | undefined,
		orderByDirection: req.query.orderByDirection as string | undefined,
	});
	const data = await getProducts({ input, user: sessionUser.user });
	return res.status(200).json(data);
};

const UpdateProductInputSchema = z.object({
	productId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo inválido para ID do produto.",
	}),
	product: ProductSchema.partial(),
});
export type TUpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

async function updateProduct({ user, input }: { user: TAuthUserSession["user"]; input: TUpdateProductInput }) {
	const product = await db.query.products.findFirst({
		where: eq(products.id, input.productId),
	});
	if (!product) throw new createHttpError.NotFound("Produto não encontrado.");
	const updatedProduct = await db.update(products).set(input.product).where(eq(products.id, input.productId)).returning({ updatedId: products.id });
	const updatedProductId = updatedProduct[0]?.updatedId;
	if (!updatedProductId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar produto.");
	return {
		data: {
			updatedId: updatedProductId,
		},
		message: "Produto atualizado com sucesso.",
	};
}
export type TUpdateProductOutput = Awaited<ReturnType<typeof updateProduct>>;
const updateProductHandler: NextApiHandler<TUpdateProductOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = UpdateProductInputSchema.parse(req.body);
	const data = await updateProduct({ user: sessionUser.user, input });
	return res.status(200).json(data);
};

export default apiHandler({ GET: getProductsHandler, PUT: updateProductHandler });
