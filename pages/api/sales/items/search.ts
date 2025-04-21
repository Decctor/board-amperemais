import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { and, count, sql } from "drizzle-orm";
import type { NextApiHandler, NextApiRequest } from "next";
import { z } from "zod";

const ItemsSearchSchema = z.object({
	page: z.number({ required_error: "Parâmetro de paginação não informado." }).default(1),
	searchDescription: z.string({
		required_error: "Parâmetro de busca não informado.",
		invalid_type_error: "Tipo não válido para busca por descrição.",
	}),
	searchCode: z.string({
		required_error: "Parâmetro de busca por código não informado.",
		invalid_type_error: "Tipo não válido para busca por código.",
	}),
});
export type TGetProductsBySearchInput = z.infer<typeof ItemsSearchSchema>;

const fetchProductsBySearch = async (req: NextApiRequest) => {
	const PAGE_SIZE = 100;
	const filters = ItemsSearchSchema.parse(req.body);

	const skip = PAGE_SIZE * (Number(filters.page) - 1);
	const limit = PAGE_SIZE;

	const conditions = [];

	if (filters.searchDescription.trim().length > 0) {
		conditions.push(
			sql`(to_tsvector('portuguese', ${products.descricao}) @@ plainto_tsquery('portuguese', ${filters.searchDescription}) OR ${products.descricao} ILIKE '%' || ${filters.searchDescription} || '%')`,
		);
	}
	if (filters.searchCode.trim().length > 0) {
		conditions.push(
			sql`(to_tsvector('portuguese', ${products.codigo}) @@ plainto_tsquery('portuguese', ${filters.searchCode}) OR ${products.codigo} ILIKE '%' || ${filters.searchCode} || '%')`,
		);
	}

	// Query the database to get the total count of matched products (for pagination)
	const productsResultMatched = await db
		.select({ count: count(products.id) })
		.from(products)
		.where(and(...conditions));
	const productsResultMatchedCount = productsResultMatched[0]?.count || 0;

	// Query the database to fetch the paginated list of products with their purchases
	const productsResult = await db.query.products.findMany({
		where: and(...conditions),
		orderBy: (fields, { asc }) => asc(fields.descricao),
		offset: skip,
		limit: limit,
	});

	const totalPages = Math.ceil(productsResultMatchedCount / PAGE_SIZE);

	return {
		products: productsResult,
		productsMatched: productsResultMatchedCount,
		totalPages: totalPages,
	};
};
export type TGetProductsBySearchOutput = Awaited<ReturnType<typeof fetchProductsBySearch>>;

const handleProductsBySearchRoute: NextApiHandler<{
	data: TGetProductsBySearchOutput;
}> = async (req, res) => {
	const session = await getUserSession({ request: req });
	const data = await fetchProductsBySearch(req);
	return res.status(200).json({
		data: data,
	});
};

export default apiHandler({
	POST: handleProductsBySearchRoute,
});
