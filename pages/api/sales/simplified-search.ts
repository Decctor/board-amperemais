import { SalesSimplifiedSearchQueryParams } from "@/schemas/sales";
import type { NextApiRequest } from "next";
import type { NextApiHandler } from "next";

import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { and, count, eq, exists, sql } from "drizzle-orm";
import createHttpError from "http-errors";

async function fetchSalesSimplified(req: NextApiRequest) {
	const PAGE_SIZE = 50;
	const { search, page } = SalesSimplifiedSearchQueryParams.parse(req.body);
	const conditions = [];
	if (search.trim().length > 0)
		conditions.push(
			exists(
				db
					.select({ id: clients.id })
					.from(clients)
					.innerJoin(sales, eq(sales.clienteId, clients.id))
					.where(
						sql`(to_tsvector('portuguese', ${clients.nome}) @@ plainto_tsquery('portuguese', ${search}) OR ${clients.nome} ILIKE '%' || ${search} || '%')`,
					),
			),
		);
	const salesResultMatched = await db
		.select({ count: count(sales.id) })
		.from(sales)
		.where(and(...conditions));
	const salesMatchedCount = salesResultMatched[0].count as number;

	const skip = PAGE_SIZE * (Number(page) - 1);
	const limit = PAGE_SIZE;

	const salesResult = await db.query.sales.findMany({
		where: and(...conditions),
		columns: {
			id: true,
			valorTotal: true,
		},
		with: {
			cliente: {
				columns: {
					id: true,
					nome: true,
				},
			},
		},
		orderBy: (fields, { desc }) => desc(fields.dataVenda),
		limit: PAGE_SIZE,
		offset: skip,
	});

	const totalPages = Math.ceil(salesMatchedCount / PAGE_SIZE);

	return { sales: salesResult, salesMatched: salesMatchedCount, totalPages };
}
export type TSalesSimplifiedSearchResult = Awaited<ReturnType<typeof fetchSalesSimplified>>;

const getSalesSimplifiedRoute: NextApiHandler<{
	data: TSalesSimplifiedSearchResult;
}> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const result = await fetchSalesSimplified(req);

	return res.status(200).json({
		data: result,
	});
};

export default apiHandler({ POST: getSalesSimplifiedRoute });
