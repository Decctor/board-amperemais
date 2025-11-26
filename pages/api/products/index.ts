import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { products, saleItems, sales } from "@/services/drizzle/schema";
import { and, count, eq, inArray, sql, sum } from "drizzle-orm";
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
	grupo: z
		.string({
			required_error: "Grupo não informado.",
			invalid_type_error: "Tipo inválido para grupo.",
		})
		.optional()
		.nullable(),
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
	if (input.grupo) {
		productQueryConditions.push(eq(products.grupo, input.grupo));
	}

	const PAGE_SIZE = 50;
	const skip = PAGE_SIZE * (input.page - 1);
	const limit = PAGE_SIZE;

	const productsMatched = await db
		.select({ count: count(products.id) })
		.from(products)
		.where(and(...productQueryConditions));
	const productsMatchedCount = productsMatched[0]?.count || 0;
	const totalPages = Math.ceil(productsMatchedCount / PAGE_SIZE);

	const productsResult = await db.query.products.findMany({
		where: and(...productQueryConditions),
		offset: skip,
		limit: limit,
	});

	const productIds = productsResult.map((product) => product.id);
	// Get stats by product (total sales value and quantity)
	const statsByProduct = await db
		.select({
			productId: products.id,
			totalSalesValue: sum(saleItems.valorVendaTotalLiquido),
			totalSalesQty: count(saleItems.id),
		})
		.from(products)
		.leftJoin(saleItems, eq(products.id, saleItems.produtoId))
		.leftJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(inArray(products.id, productIds))
		.groupBy(products.id);

	const productsWithStats = productsResult
		.map((product) => {
			const stats = statsByProduct.find((s) => s.productId === product.id);
			return {
				...product,
				estatisticas: {
					vendasValorTotal: stats?.totalSalesValue ? Number(stats.totalSalesValue) : 0,
					vendasQtdeTotal: stats?.totalSalesQty ? Number(stats.totalSalesQty) : 0,
				},
			};
		})
		.sort((a, b) => {
			if (input.orderByField === "descricao") {
				if (input.orderByDirection === "asc") {
					return a.descricao.localeCompare(b.descricao);
				}
				return b.descricao.localeCompare(a.descricao);
			}
			if (input.orderByField === "codigo") {
				if (input.orderByDirection === "asc") {
					return a.codigo.localeCompare(b.codigo);
				}
				return b.codigo.localeCompare(a.codigo);
			}
			if (input.orderByField === "grupo") {
				if (input.orderByDirection === "asc") {
					return a.grupo.localeCompare(b.grupo);
				}
				return b.grupo.localeCompare(a.grupo);
			}
			if (input.orderByField === "vendasValorTotal") {
				if (input.orderByDirection === "asc") {
					return a.estatisticas.vendasValorTotal - b.estatisticas.vendasValorTotal;
				}
				return b.estatisticas.vendasValorTotal - a.estatisticas.vendasValorTotal;
			}
			if (input.orderByField === "vendasQtdeTotal") {
				if (input.orderByDirection === "asc") {
					return a.estatisticas.vendasQtdeTotal - b.estatisticas.vendasQtdeTotal;
				}
				return b.estatisticas.vendasQtdeTotal - a.estatisticas.vendasQtdeTotal;
			}
			return 0;
		});

	return {
		data: {
			default: {
				products: productsWithStats,
				productsMatched: productsMatchedCount,
				totalPages: totalPages,
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
		grupo: req.query.grupo as string | undefined,
		orderByField: req.query.orderByField as string | undefined,
		orderByDirection: req.query.orderByDirection as string | undefined,
	});
	const data = await getProducts({ input, user: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({ GET: getProductsHandler });
