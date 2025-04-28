import type { NextApiRequest } from "next";
import { SalesSimplifiedSearchQueryParams } from "@/schemas/sales";
import type { NextApiHandler } from "next";

import { apiHandler } from "@/lib/api";
import { and, count, eq, exists, sql } from "drizzle-orm";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { getUserSession } from "@/lib/auth/session";

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
	const session = await getUserSession({ request: req });

	const result = await fetchSalesSimplified(req);

	return res.status(200).json({
		data: result,
	});
	// const orSearchQuery = search.length > 0 ? [{ cliente: search }, { cliente: { $regex: search, $options: "i" } }] : [];

	// const query: Filter<TSale> = orSearchQuery.length > 0 ? { $or: [...orSearchQuery] } : {};

	// const skip = (page - 1) * PAGE_SIZE;
	// const limit = PAGE_SIZE;

	// const salesMatched = await collection.countDocuments(query);
	// const totalPages = Math.ceil(salesMatched / PAGE_SIZE);

	// const salesResult = await collection.find(query, { skip, limit, projection: SaleSimplifiedProjection }).toArray();

	// return res.status(200).json({ data: { sales: salesResult as any[], salesMatched, totalPages } });
};

export default apiHandler({ POST: getSalesSimplifiedRoute });
