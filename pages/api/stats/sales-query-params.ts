import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { db } from "@/services/drizzle";
import { partners, products, sales, sellers } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
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
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const groupedSaleNatures = await db
		.select({
			saleNature: sales.natureza,
		})
		.from(sales)
		.where(eq(sales.organizacaoId, userOrgId))
		.groupBy(sales.natureza);

	const groupedSellers = await db.query.sellers.findMany({
		where: and(eq(sellers.organizacaoId, userOrgId), eq(sellers.ativo, true)),
		columns: {
			id: true,
			identificador: true,
			nome: true,
			avatarUrl: true,
		},
	});

	const groupedPartners = await db.query.partners.findMany({
		where: eq(partners.organizacaoId, userOrgId),
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
		.where(eq(products.organizacaoId, userOrgId))
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
