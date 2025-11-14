import { apiHandler } from "@/lib/api";
import { db } from "@/services/drizzle";
import { products, sales } from "@/services/drizzle/schema";
import type { NextApiHandler } from "next";

export type TSaleQueryFilterOptions = {
	saleNatures: string[];
	sellers: string[];
	productsGroups: string[];
};
const getSaleQueryFiltersRoute: NextApiHandler<{ data: TSaleQueryFilterOptions }> = async (req, res) => {
	const groupedSaleNatures = await db
		.select({
			saleNature: sales.natureza,
		})
		.from(sales)
		.groupBy(sales.natureza);

	const groupedSellers = await db
		.select({
			seller: sales.vendedorNome,
		})
		.from(sales)
		.groupBy(sales.vendedorNome);

	const groupedProductGroups = await db
		.select({
			group: products.grupo,
		})
		.from(products)
		.groupBy(products.grupo);
	// const salesCollection: Collection<TSale> = db.collection("sales");

	// const saleNaturesResult = await salesCollection.aggregate([{ $group: { _id: "$natureza" } }]).toArray();
	// const saleNatures = saleNaturesResult.map((current) => current._id);
	// const sellersResult = await salesCollection.aggregate([{ $group: { _id: "$vendedor" } }]).toArray();
	// const sellers = sellersResult.map((current) => current._id);

	// const productsGroupsResult = await salesCollection
	// 	.aggregate([{ $unwind: { path: "$itens", preserveNullAndEmptyArrays: false } }, { $group: { _id: "$itens.grupo" } }])
	// 	.toArray();
	// const productsGroups = productsGroupsResult.map((current) => current._id);
	return res.status(200).json({
		data: {
			saleNatures: groupedSaleNatures.map((s) => s.saleNature),
			sellers: groupedSellers.map((s) => s.seller),
			productsGroups: groupedProductGroups.map((p) => p.group),
		},
	});
};

export default apiHandler({ GET: getSaleQueryFiltersRoute });
