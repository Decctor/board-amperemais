import { apiHandler } from "@/lib/api";
import { db } from "@/services/drizzle";
import { products, sales } from "@/services/drizzle/schema";
import type { NextApiHandler } from "next";

export type TSaleQueryFilterOptions = {
	saleNatures: {
		id: string;
		label: string;
		value: string;
	}[];
	sellers: {
		id: string;
		label: string;
		value: string;
	}[];
	partners: {
		id: string;
		label: string;
		value: string;
	}[];
	productsGroups: {
		id: string;
		label: string;
		value: string;
	}[];
};
const getSaleQueryFiltersRoute: NextApiHandler<{ data: TSaleQueryFilterOptions }> = async (req, res) => {
	const groupedSaleNatures = await db
		.select({
			saleNature: sales.natureza,
		})
		.from(sales)
		.groupBy(sales.natureza);

	const groupedSellers = await db.query.sellers.findMany({
		columns: {
			id: true,
			identificador: true,
			nome: true,
			avatarUrl: true,
		},
	});

	const groupedPartners = await db.query.partners.findMany({
		columns: {
			id: true,
			identificador: true,
			nome: true,
			avatarUrl: true,
		},
	});
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
			saleNatures: groupedSaleNatures.map((s) => ({
				id: s.saleNature,
				label: s.saleNature,
				value: s.saleNature,
			})),
			sellers: groupedSellers.map((s) => ({
				id: s.id,
				label: s.nome,
				value: s.identificador,
			})),
			partners: groupedPartners.map((p) => ({
				id: p.id,
				label: p.identificador,
				value: p.identificador,
			})),
			productsGroups: groupedProductGroups.map((p) => ({
				id: p.group,
				label: p.group,
				value: p.group,
			})),
		},
	});
};

export default apiHandler({ GET: getSaleQueryFiltersRoute });
