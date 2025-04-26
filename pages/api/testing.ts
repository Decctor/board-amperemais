import dayjs from "dayjs";
import type { NextApiHandler } from "next";
import TestingJSON from "@/testing.json";
import { db } from "@/services/drizzle";
import { apiHandler } from "@/lib/api";
import { products, sales } from "@/services/drizzle/schema";
import { count } from "drizzle-orm";
const handleTesting: NextApiHandler<any> = async (req, res) => {
	const grouped = await db
		.select({
			key: products.codigo,
			count: count(products.codigo),
		})
		.from(products)
		.groupBy(products.codigo);

	return res.status(200).json({
		grouped: grouped.sort((a, b) => b.count - a.count),
	});
};

export default apiHandler({
	GET: handleTesting,
});
