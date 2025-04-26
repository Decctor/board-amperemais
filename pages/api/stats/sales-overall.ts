import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import type { TClient } from "@/schemas/clients";
import { SalesGeneralStatsFiltersSchema, type TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import type { TSaleGoal } from "@/schemas/sale-goals";
import type { TSale } from "@/schemas/sales";
import type { TSaleItem } from "@/schemas/sales-items";
import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales } from "@/services/drizzle/schema";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import dayjs from "dayjs";
import { and, eq, exists, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import type { Collection } from "mongodb";
import type { NextApiHandler } from "next";

type TOverallSalesStatsReduced = {
	faturamentoBruto: number;
	gastoBruto: number;
	qtdeVendas: number;
	qtdeItensVendidos: number;
};

export type TOverallSalesStats = {
	faturamentoBruto: number;
	faturamentoLiquido: number;
	faturamentoMeta: number;
	faturamentoMetaPorcentagem: number;
	qtdeVendas: number;
	ticketMedio: number;
	qtdeItensVendidos: number;
	itensPorVendaMedio: number;
	valorDiarioVendido: number;
};
type GetResponse = {
	data: TOverallSalesStats;
};
const getSalesOverallStatsRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const user = await getUserSession({ request: req });

	const filters = SalesGeneralStatsFiltersSchema.parse(req.body);

	const db = await connectToDatabase();
	const goalsCollection = db.collection<TSaleGoal>("goals");

	const sales = await getSales({ filters });
	const overallSaleGoal = await getOverallSaleGoal({
		collection: goalsCollection,
		after: filters.period.after,
		before: filters.period.before,
	});

	const stats = sales.reduce(
		(acc: TOverallSalesStatsReduced, current) => {
			// updating sales quantity stats
			acc.qtdeVendas += 1;

			const applicableItems = current.itens.filter((item) =>
				filters.productGroups.length > 0 ? filters.productGroups.includes(item.produto.grupo) : true,
			);
			for (const item of applicableItems) {
				acc.qtdeItensVendidos += item.quantidade;
				acc.gastoBruto += item.valorCustoTotal;
				acc.faturamentoBruto += item.valorVendaTotalLiquido;
			}
			return acc;
		},
		{
			faturamentoBruto: 0,
			gastoBruto: 0,
			qtdeVendas: 0,
			qtdeItensVendidos: 0,
		} as TOverallSalesStatsReduced,
	);

	const overallStats: TOverallSalesStats = {
		faturamentoBruto: stats.faturamentoBruto,
		faturamentoLiquido: stats.faturamentoBruto - stats.gastoBruto,
		faturamentoMeta: overallSaleGoal,
		faturamentoMetaPorcentagem: (stats.faturamentoBruto / overallSaleGoal) * 100,
		qtdeVendas: stats.qtdeVendas,
		ticketMedio: stats.faturamentoBruto / stats.qtdeVendas,
		qtdeItensVendidos: stats.qtdeItensVendidos,
		itensPorVendaMedio: stats.qtdeItensVendidos / stats.qtdeVendas,
		valorDiarioVendido: stats.faturamentoBruto / dayjs(filters.period.before).diff(dayjs(filters.period.after), "days"),
	};
	return res.status(200).json({ data: overallStats });
};

export default apiHandler({
	POST: getSalesOverallStatsRoute,
});

type GetSalesParams = {
	filters: TSaleStatsGeneralQueryParams;
};
async function getSales({ filters }: GetSalesParams) {
	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;

	console.log("GETTING SALES", {
		ajustedAfter: ajustedAfter?.toISOString(),
		ajustedBefore: ajustedBefore?.toISOString(),
	});
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
			columns: {
				id: true,
			},
			with: {
				cliente: {
					columns: {
						nome: true,
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
		});
		return salesResult;
	} catch (error) {
		console.log("Error getting sales", error);
		throw error;
	}
}

type GetOverallSaleGoalProps = {
	collection: Collection<TSaleGoal>;
	after: string;
	before: string;
};
async function getOverallSaleGoal({ collection, after, before }: GetOverallSaleGoalProps) {
	const ajustedAfter = after;
	const ajustedBefore = dayjs(before).endOf("day").toISOString();
	try {
		const goals = await collection
			.find({
				$or: [{ inicio: { $lte: ajustedAfter } }, { fim: { $gte: ajustedBefore } }],
			})
			.toArray();
		const applicableSaleGoal = goals.reduce((acc, current) => {
			const monthsGoalReduced = Object.values(current.meses).reduce((acc, monthCurrent) => {
				const afterDatetime = new Date(after).getTime();
				const beforeDatetime = new Date(before).getTime();

				const monthStartDatetime = new Date(monthCurrent.inicio).getTime();
				const monthEndDatetime = new Date(monthCurrent.fim).getTime();

				if (
					(afterDatetime < monthStartDatetime && beforeDatetime < monthStartDatetime) ||
					(afterDatetime > monthEndDatetime && beforeDatetime > monthEndDatetime)
				)
					return acc;
				// Caso o período de filtro da query compreenda o mês inteiro
				if (afterDatetime <= monthStartDatetime && beforeDatetime >= monthEndDatetime) {
					return acc + monthCurrent.vendas;
				}
				if (beforeDatetime > monthEndDatetime) {
					const applicableDays = dayjs(monthCurrent.fim).diff(dayjs(after), "days");

					return acc + (monthCurrent.vendas * applicableDays) / monthCurrent.dias;
				}
				const applicableDays = dayjs(before).diff(dayjs(monthCurrent.inicio), "days");

				return acc + (monthCurrent.vendas * applicableDays) / monthCurrent.dias;
			}, 0);
			return acc + monthsGoalReduced;
		}, 0);

		return applicableSaleGoal;
	} catch (error) {
		console.log("Error getting overall sale goal", error);
		throw error;
	}
}
