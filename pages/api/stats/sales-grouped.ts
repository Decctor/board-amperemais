import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { SalesGeneralStatsFiltersSchema, type TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";

import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, exists, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import type { NextApiHandler } from "next";

type TGroupedSalesStatsReduced = {
	porItem: {
		[key: string]: { qtde: number; total: number };
	};
	porGrupo: {
		[key: string]: { qtde: number; total: number };
	};
	porVendedor: {
		[key: string]: { qtde: number; total: number };
	};
};

export type TGroupedSalesStats = {
	porItem: {
		titulo: string;
		qtde: number;
		total: number;
	}[];
	porGrupo: {
		titulo: string;
		qtde: number;
		total: number;
	}[];
	porVendedor: {
		titulo: string;
		qtde: number;
		total: number;
	}[];
};

type GetResponse = {
	data: TGroupedSalesStats;
};
const getSalesGroupedStatsRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const user = await getUserSession({ request: req });
	const filters = SalesGeneralStatsFiltersSchema.parse(req.body);

	const sales = await getSales({ filters });

	const stats = sales.reduce(
		(acc: TGroupedSalesStatsReduced, current) => {
			let totalFiltered = 0;

			const applicableItems = current.itens.filter((item) =>
				filters.productGroups.length > 0 ? filters.productGroups.includes(item.produto.grupo) : true,
			);
			for (const item of applicableItems) {
				if (!acc.porGrupo[item.produto.grupo]) acc.porGrupo[item.produto.grupo] = { qtde: 0, total: 0 };
				if (!acc.porItem[item.produto.descricao]) acc.porItem[item.produto.descricao] = { qtde: 0, total: 0 };

				acc.porGrupo[item.produto.grupo].qtde += 1;
				acc.porGrupo[item.produto.grupo].total += item.valorVendaTotalLiquido;

				acc.porItem[item.produto.descricao].qtde += 1;
				acc.porItem[item.produto.descricao].total += item.valorVendaTotalLiquido;

				totalFiltered += item.valorVendaTotalLiquido;
			}

			//  Updating stats by seller
			if (!acc.porVendedor[current.vendedor]) acc.porVendedor[current.vendedor] = { qtde: 0, total: 0 };
			acc.porVendedor[current.vendedor].qtde += 1;
			acc.porVendedor[current.vendedor].total += totalFiltered;

			return acc;
		},
		{
			porGrupo: {},
			porVendedor: {},
			porItem: {},
		} as TGroupedSalesStatsReduced,
	);

	const groupedStats: TGroupedSalesStats = {
		porItem: Object.entries(stats.porItem)
			.map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
			.sort((a, b) => b.total - a.total),
		porGrupo: Object.entries(stats.porGrupo)
			.map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
			.sort((a, b) => b.total - a.total),
		porVendedor: Object.entries(stats.porVendedor)
			.map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
			.sort((a, b) => b.total - a.total),
	};

	return res.status(200).json({ data: groupedStats });
};

export default apiHandler({ POST: getSalesGroupedStatsRoute });

type GetSalesParams = {
	filters: TSaleStatsGeneralQueryParams;
};
async function getSales({ filters }: GetSalesParams) {
	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;
	try {
		const conditions = [];

		if (ajustedAfter) conditions.push(gte(sales.dataVenda, ajustedAfter));
		if (ajustedBefore) conditions.push(lte(sales.dataVenda, ajustedBefore));
		if (filters.total.min) conditions.push(gte(sales.valorTotal, filters.total.min));
		if (filters.total.max) conditions.push(gte(sales.valorTotal, filters.total.max));

		if (filters.saleNatures.length > 0) conditions.push(inArray(sales.natureza, filters.saleNatures));

		if (filters.sellers.length > 0) conditions.push(inArray(sales.vendedor, filters.sellers));

		if (filters.clientRFMTitles.length > 0)
			exists(
				db
					.select({ id: clients.id })
					.from(clients)
					.where(and(eq(clients.id, sales.clienteId), inArray(clients.analiseRFMTitulo, filters.clientRFMTitles))),
			);

		// How to apply filter for product groups present in sale ???

		// if (filters.productGroups.length > 0) {
		// 	conditions.push(
		// 		exists(
		// 			db
		// 				.select({ id: saleItems.id })
		// 				.from(saleItems)
		// 				.innerJoin(products, eq(saleItems.produtoId, products.id))
		// 				.where(
		// 					and(
		// 						// Aqui está a correção - correlacionando com a tabela externa
		// 						sql`${saleItems.vendaId} = ${sales.id}`,
		// 						inArray(products.grupo, filters.productGroups),
		// 					),
		// 				),
		// 		),
		// 	);
		// }
		if (filters.excludedSalesIds) conditions.push(notInArray(sales.id, filters.excludedSalesIds));

		const salesResult = await db.query.sales.findMany({
			where: and(...conditions),
			with: {
				cliente: {
					columns: {
						nome: true,
						analiseRFMTitulo: true,
					},
				},
				itens: {
					columns: {
						quantidade: true,
						valorVendaTotalLiquido: true,
						valorCustoTotal: true,
					},
					with: {
						produto: {
							columns: {
								descricao: true,
								grupo: true,
							},
						},
					},
				},
			},
			columns: {
				vendedor: true,
				natureza: true,
				parceiro: true,
				dataVenda: true,
			},
		});

		return salesResult;
	} catch (error) {
		console.log("Error getting sales", error);
		throw error;
	}
}
