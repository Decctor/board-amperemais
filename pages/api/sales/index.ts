import type { TSale } from "@/schemas/sales";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import type { NextApiHandler } from "next";

type GetResponse = {
	data: TSale | TSale[];
};

const getSalesRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const { id, after, before } = req.query;

	const conditions = [];
	if (id && typeof id === "string") conditions.push(eq(sales.id, id));
	if (after && typeof after === "string") conditions.push(gte(sales.dataVenda, new Date(after)));
	if (before && typeof before === "string") conditions.push(lte(sales.dataVenda, new Date(before)));
	const salesResult = await db.query.sales.findMany({
		where: and(...conditions),
	});

	return {
		data: salesResult,
	};
};
