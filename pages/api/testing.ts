import { apiHandler } from "@/lib/api";
import { db } from "@/services/drizzle";
import type { NextApiHandler } from "next";

import { ProductEmbeddingService } from "@/services/ai";
import { sales, sellers } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { count, eq, sql, sum } from "drizzle-orm";
const handleTesting: NextApiHandler<any> = async (req, res) => {
	const startOfMonth = dayjs().startOf("month").toDate();
	const today = dayjs().endOf("day").toDate();

	const insertedIds = await db.transaction(async (tx) => {
		const sellers = await tx.query.sellers.findMany({
			columns: {
				id: true,
				identificador: true,
			},
		});

		for (const seller of sellers) {
			console.log(`Processing seller ${seller.identificador}`);
			const updated = await tx
				.update(sales)
				.set({
					vendedorId: seller.id,
				})
				.where(eq(sales.vendedorNome, seller.identificador))
				.returning({ id: sales.id });

			console.log(`Updated ${updated.length} sales for seller ${seller.identificador}`);
		}
	});
	res.status(200).json(insertedIds);
};

export default apiHandler({
	GET: handleTesting,
});
