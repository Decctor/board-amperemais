import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { SalesGeneralStatsFiltersSchema, type TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";

import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, exists, gte, inArray, lte, sql, sum, notInArray, isNotNull, max, min } from "drizzle-orm";
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
	porParceiro: {
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
	porParceiro: {
		titulo: string;
		qtde: number;
		total: number;
		ultimaCompra: Date | null;
		vendedorMaisFrequente: string | null;
		tempoAtividade: Date | null;
	}[];
};

type GetResponse = {
	data: TGroupedSalesStats;
};
const getSalesGroupedStatsRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const user = await getUserSession({ request: req });
	const filters = SalesGeneralStatsFiltersSchema.parse(req.body);

	const stats = await getSalesGroupedStats({ filters });

	return res.status(200).json({
		data: {
			porItem: stats.porItem.map((item) => ({ titulo: item.titulo, qtde: item.qtde, total: item.total ? Number(item.total) : 0 })),
			porGrupo: stats.porGrupo.map((item) => ({ titulo: item.titulo, qtde: item.qtde, total: item.total ? Number(item.total) : 0 })),
			porVendedor: stats.porVendedor.map((item) => ({ titulo: item.titulo, qtde: item.qtde, total: item.total ? Number(item.total) : 0 })),
			porParceiro: stats.porParceiro.map((item) => ({
				titulo: item.titulo,
				qtde: item.qtde,
				total: item.total ? Number(item.total) : 0,
				ultimaCompra: item.ultimaCompra,
				vendedorMaisFrequente: item.vendedorMaisFrequente,
				tempoAtividade: item.tempoAtividade,
			})),
		},
	});

	// const sales = await getSales({ filters });

	// const stats = sales.reduce(
	// 	(acc: TGroupedSalesStatsReduced, current) => {
	// 		let totalFiltered = 0;

	// 		const applicableItems = current.itens.filter((item) =>
	// 			filters.productGroups.length > 0 ? filters.productGroups.includes(item.produto.grupo) : true,
	// 		);
	// 		for (const item of applicableItems) {
	// 			if (!acc.porGrupo[item.produto.grupo]) acc.porGrupo[item.produto.grupo] = { qtde: 0, total: 0 };
	// 			if (!acc.porItem[item.produto.descricao]) acc.porItem[item.produto.descricao] = { qtde: 0, total: 0 };

	// 			acc.porGrupo[item.produto.grupo].qtde += 1;
	// 			acc.porGrupo[item.produto.grupo].total += item.valorVendaTotalLiquido;

	// 			acc.porItem[item.produto.descricao].qtde += 1;
	// 			acc.porItem[item.produto.descricao].total += item.valorVendaTotalLiquido;

	// 			totalFiltered += item.valorVendaTotalLiquido;
	// 		}

	// 		//  Updating stats by seller
	// 		if (!acc.porVendedor[current.vendedor]) acc.porVendedor[current.vendedor] = { qtde: 0, total: 0 };
	// 		acc.porVendedor[current.vendedor].qtde += 1;
	// 		acc.porVendedor[current.vendedor].total += totalFiltered;

	// 		// Updating stats by partner
	// 		if (!acc.porParceiro[current.parceiro]) acc.porParceiro[current.parceiro] = { qtde: 0, total: 0 };
	// 		acc.porParceiro[current.parceiro].qtde += 1;
	// 		acc.porParceiro[current.parceiro].total += totalFiltered;
	// 		return acc;
	// 	},
	// 	{
	// 		porGrupo: {},
	// 		porVendedor: {},
	// 		porItem: {},
	// 		porParceiro: {},
	// 	} as TGroupedSalesStatsReduced,
	// );

	// console.log(stats);
	// const groupedStats: TGroupedSalesStats = {
	// 	porItem: Object.entries(stats.porItem)
	// 		.map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
	// 		.sort((a, b) => b.total - a.total),
	// 	porGrupo: Object.entries(stats.porGrupo)
	// 		.map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
	// 		.sort((a, b) => b.total - a.total),
	// 	porVendedor: Object.entries(stats.porVendedor)
	// 		.map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
	// 		.sort((a, b) => b.total - a.total),
	// 	porParceiro: Object.entries(stats.porParceiro)
	// 		.map(([key, value]) => ({ titulo: key, qtde: value.qtde, total: value.total }))
	// 		.sort((a, b) => b.total - a.total),
	// };

	// return res.status(200).json({ data: groupedStats });
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

async function getSalesGroupedStats({ filters }: GetSalesParams) {
	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;

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

	if (filters.excludedSalesIds) conditions.push(notInArray(sales.id, filters.excludedSalesIds));

	const resultsBySeller = await db
		.select({
			titulo: sales.vendedor,
			qtde: count(sales.id),
			total: sum(sales.valorTotal),
		})
		.from(sales)
		.where(and(...conditions))
		.groupBy(sales.vendedor);

	// Query para obter contagem de vendas por parceiro e vendedor
	const salesByPartnerAndSeller = await db
		.select({
			parceiro: sales.parceiro,
			vendedor: sales.vendedor,
			qtdeVendas: count(sales.id),
		})
		.from(sales)
		.where(and(...conditions, isNotNull(sales.parceiro), notInArray(sales.parceiro, ["", "0", "N/A"])))
		.groupBy(sales.parceiro, sales.vendedor);

	// Query para obter a primeira venda de cada parceiro (sem filtros de período)
	const firstSaleByPartner = await db
		.select({
			parceiro: sales.parceiro,
			primeiraVenda: min(sales.dataVenda),
		})
		.from(sales)
		.where(and(isNotNull(sales.parceiro), notInArray(sales.parceiro, ["", "0", "N/A"])))
		.groupBy(sales.parceiro);

	const resultsByPartner = await db
		.select({
			titulo: sales.parceiro,
			qtde: count(sales.id),
			total: sum(sales.valorTotal),
			ultimaCompra: max(sales.dataVenda),
		})
		.from(sales)
		.where(and(...conditions, isNotNull(sales.parceiro), notInArray(sales.parceiro, ["", "0", "N/A"])))
		.groupBy(sales.parceiro);

	// Enriquecendo os resultados com vendedor mais frequente e tempo de atividade
	const enrichedResultsByPartner = resultsByPartner.map((partner) => {
		// Encontra o vendedor com mais vendas para este parceiro
		const mostFrequentSeller = salesByPartnerAndSeller.filter((v) => v.parceiro === partner.titulo).sort((a, b) => b.qtdeVendas - a.qtdeVendas);

		// Encontra a primeira venda deste parceiro
		const firstSale = firstSaleByPartner.find((p) => p.parceiro === partner.titulo);

		return {
			...partner,
			vendedorMaisFrequente: mostFrequentSeller[0]?.vendedor || null,
			tempoAtividade: firstSale?.primeiraVenda || null,
		};
	});

	const resultsByItem = await db
		.select({
			titulo: products.descricao,
			qtde: count(saleItems.id),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.where(
			exists(
				db
					.select({ id: sales.id })
					.from(sales)
					.where(and(eq(sales.id, saleItems.vendaId), ...conditions)),
			),
		)
		.innerJoin(products, eq(saleItems.produtoId, products.id))
		.groupBy(products.descricao);

	const resultsByItemGroup = await db
		.select({
			titulo: products.grupo,
			qtde: count(saleItems.id),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.where(
			exists(
				db
					.select({ id: sales.id })
					.from(sales)
					.where(and(eq(sales.id, saleItems.vendaId), ...conditions)),
			),
		)
		.innerJoin(products, eq(saleItems.produtoId, products.id))
		.groupBy(products.grupo);

	return {
		porItem: resultsByItem,
		porGrupo: resultsByItemGroup,
		porVendedor: resultsBySeller,
		porParceiro: enrichedResultsByPartner,
	};
}
