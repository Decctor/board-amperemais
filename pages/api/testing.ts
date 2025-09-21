import { apiHandler } from "@/lib/api";
import { db } from "@/services/drizzle";
import type { NextApiHandler } from "next";

import { ProductEmbeddingService } from "@/services/ai";
import { sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { count, sql, sum } from "drizzle-orm";
const handleTesting: NextApiHandler<any> = async (req, res) => {
	const startOfMonth = dayjs().startOf("month").toDate();
	const today = dayjs().endOf("day").toDate();

	const sales = await db.query.sales.findMany({
		where: (fields, { and, gte, lte }) => and(gte(fields.dataVenda, startOfMonth), lte(fields.dataVenda, today)),
		columns: {
			valorTotal: true,
			custoTotal: true,
			dataVenda: true,
		},
		with: {
			itens: {
				columns: {
					id: true,
					produtoId: true,
					quantidade: true,
					valorVendaUnitario: true,
					valorCustoUnitario: true,
					valorCustoTotal: true,
					valorVendaTotalBruto: true,
					valorTotalDesconto: true,
					valorVendaTotalLiquido: true,
				},
				with: {
					produto: {
						columns: {
							descricao: true,
						},
					},
				},
			},
		},
	});
	const potentialBugs = sales.filter((sale) => sale.custoTotal / sale.valorTotal > 2);
	console.log("[INFO] [TESTING] Potential bugs: ", potentialBugs.length);
	res.status(200).json(potentialBugs);
	// res.status(200).json(sales);
};

export default apiHandler({
	GET: handleTesting,
});
