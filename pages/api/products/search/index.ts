import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { and, sql } from "drizzle-orm";
import { count } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

const GetProductsBySearchInputSchema = z.object({
	search: z.string({
		required_error: "Busca não informada.",
		invalid_type_error: "Tipo inválido para busca.",
	}),
	page: z
		.string({
			required_error: "Página não informada.",
			invalid_type_error: "Tipo inválido para página.",
		})
		.transform((val) => Number(val)),
});
export type TGetProductsBySearchInput = z.infer<typeof GetProductsBySearchInputSchema>;

async function getProductsBySearch({ input }: { input: TGetProductsBySearchInput }) {
	const PAGE_SIZE = 25;

	const skip = PAGE_SIZE * (input.page - 1);
	const limit = PAGE_SIZE;

	const conditions = [];

	if (input.search.length > 0) {
		conditions.push(sql`(${products.descricao} ILIKE '%' || ${input.search} || '%' OR ${products.codigo} ILIKE '%' || ${input.search} || '%')`);
	}
	const productsMatched = await db
		.select({ count: count(products.id) })
		.from(products)
		.where(and(...conditions));

	const productsMatchedCount = productsMatched[0]?.count || 0;

	const totalPages = Math.ceil(productsMatchedCount / PAGE_SIZE);
	const productsResult = await db.query.products.findMany({
		where: and(...conditions),
		offset: skip,
		limit: limit,
		orderBy: (fields, { desc }) => desc(fields.descricao),
	});

	return {
		data: {
			products: productsResult,
			productsMatched: productsMatchedCount,
			totalPages: totalPages,
		},
	};
}
export type TGetProductsBySearchOutput = Awaited<ReturnType<typeof getProductsBySearch>>;

const getProductsBySearchHandler: NextApiHandler<TGetProductsBySearchOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetProductsBySearchInputSchema.parse(req.query);
	const data = await getProductsBySearch({ input });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getProductsBySearchHandler,
});
