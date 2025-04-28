import { apiHandler } from "@/lib/api";
import { TClient } from "@/schemas/clients";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import axios from "axios";
import dayjs from "dayjs";
import { Collection, ObjectId } from "mongodb";
import type { NextApiHandler } from "next";
import dayjsCustomFormatter from "dayjs/plugin/customParseFormat";
import { db } from "@/services/drizzle";
import { and, eq, gte, lte, sum } from "drizzle-orm";
import { saleItems, sales } from "@/services/drizzle/schema";
// import OnlineSalesRegistries from "@/sales-till-now.json";
import { z } from "zod";
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";

dayjs.extend(dayjsCustomFormatter);

const getExport: NextApiHandler<any> = async (req, res) => {
	// const startOfMonth = dayjs().startOf("month").toDate();
	// const endOfMonth = dayjs().endOf("month").toDate();
	// console.log("startOfMonth", startOfMonth);
	// console.log("endOfMonth", endOfMonth);
	// const salesResult = await db.query.sales.findMany({
	// 	where: and(gte(sales.dataVenda, startOfMonth), lte(sales.dataVenda, endOfMonth)),
	// 	with: {
	// 		itens: true,
	// 	},
	// });

	// const OnlineSales = z.array(OnlineSoftwareSaleImportationSchema).parse(OnlineSalesRegistries);

	// for (const sale of salesResult) {
	// 	const equivalentOnlineSale = OnlineSales.find((s) => s.id === sale.idExterno);
	// 	if (equivalentOnlineSale) {
	// 		const equivalentOnlineSaleTotal = equivalentOnlineSale.valor ? Number(equivalentOnlineSale.valor) : 0;
	// 		await db
	// 			.update(sales)
	// 			.set({
	// 				valorTotal: equivalentOnlineSaleTotal,
	// 			})
	// 			.where(eq(sales.id, sale.id));
	// 		if (equivalentOnlineSale.itens.length === 0) {
	// 			await db.delete(saleItems).where(eq(saleItems.vendaId, sale.id));
	// 		}
	// 	}
	// }

	return res.json("OK");
};

export default apiHandler({ GET: getExport });
