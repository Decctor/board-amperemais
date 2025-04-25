import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import {
	getBestNumberOfPointsBetweenDates,
	getDateBuckets,
	getDayStringsBetweenDates,
	getEvenlySpacedDates,
	getYearStringsBetweenDates,
} from "@/lib/dates";
import { SalesGraphFilterSchema, type TSalesGraphFilters } from "@/schemas/query-params-utils";
import type { TSaleGoal } from "@/schemas/sale-goals";

import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales } from "@/services/drizzle/schema";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import type { TIntervalGrouping } from "@/utils/graphs";
import dayjs from "dayjs";
import { and, eq, exists, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import type { Collection } from "mongodb";
import type { NextApiHandler, NextApiRequest } from "next";
import type { z } from "zod";

export type TSalesGraphInput = z.infer<typeof SalesGraphFilterSchema>;

type TSalesGraphReduced = {
	[key: string]: {
		ATUAL: {
			qtde: number;
			total: number;
		};
		ANTERIOR: {
			qtde: number;
			total: number;
		};
	};
};
export type TSalesGraphOutput = {
	titulo: string;
	ATUAL: {
		qtde: number;
		total: number;
	};
	ANTERIOR: {
		qtde: number;
		total: number;
	};
	meta: number;
}[];
async function fetchSalesGraph(req: NextApiRequest) {
	const filters = SalesGraphFilterSchema.parse(req.body);
	const mongoDb = await connectToDatabase();
	const goalsCollection = mongoDb.collection<TSaleGoal>("goals");

	const currentPeriodAjusted = {
		after: new Date(filters.period.after),
		before: new Date(filters.period.before),
	};
	console.log("currentPeriodAjusted", currentPeriodAjusted);
	const previousYearPeriodAjusted = {
		after: dayjs(currentPeriodAjusted.after).subtract(1, "year").toDate(),
		before: dayjs(currentPeriodAjusted.before).subtract(1, "year").toDate(),
	};
	console.log("previousYearPeriodAjusted", previousYearPeriodAjusted);
	const { points: bestNumberOfPointsForPeriodsDates, groupingFormat } = getBestNumberOfPointsBetweenDates({
		startDate: currentPeriodAjusted.after,
		endDate: currentPeriodAjusted.before,
	});
	const currentPeriodDatesStrs = getEvenlySpacedDates({
		startDate: currentPeriodAjusted.after,
		endDate: currentPeriodAjusted.before,
		points: bestNumberOfPointsForPeriodsDates,
	});

	const currentPeriodDateBuckets = getDateBuckets(currentPeriodDatesStrs);

	const currentPeriodSales = await getSalesGrouped({
		filters: {
			...filters,
			period: {
				after: currentPeriodAjusted.after.toISOString(),
				before: currentPeriodAjusted.before.toISOString(),
			},
		},
	});

	const salesGoal = await getSalesGoal({
		collection: goalsCollection,
		after: currentPeriodAjusted.after.toISOString(),
		before: currentPeriodAjusted.before.toISOString(),
	});

	const previousYearPeriodDatesStrs = getEvenlySpacedDates({
		startDate: previousYearPeriodAjusted.after,
		endDate: previousYearPeriodAjusted.before,
		points: bestNumberOfPointsForPeriodsDates,
	});

	const previousYearPeriodDateBuckets = getDateBuckets(previousYearPeriodDatesStrs);

	const previousYearPeriodSales = await getSalesGrouped({
		filters: {
			...filters,
			period: {
				after: previousYearPeriodAjusted.after.toISOString(),
				before: previousYearPeriodAjusted.before.toISOString(),
			},
		},
	});

	const initialSalesReduced: TSalesGraphReduced = Object.fromEntries(
		previousYearPeriodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { ATUAL: { qtde: 0, total: 0 }, ANTERIOR: { qtde: 0, total: 0 } }]),
	);

	const currentPeriodSalesReduced = currentPeriodSales.reduce((acc: TSalesGraphReduced, current) => {
		const saleDate = new Date(current.dataVenda);
		const saleTime = saleDate.getTime();
		// Finding the correct - O(1) in average
		const bucket = currentPeriodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
		if (!bucket) return acc;
		// updating daily statistics
		const key = dayjs(bucket.key).format(groupingFormat);
		console.log("CURRENT", key);
		if (!acc[key]) acc[key] = { ATUAL: { qtde: 0, total: 0 }, ANTERIOR: { qtde: 0, total: 0 } };

		acc[key].ATUAL.qtde += Number(current.quantidade);
		acc[key].ATUAL.total += Number(current.valorTotal);
		return acc;
	}, initialSalesReduced);

	const salesGraphReduced = previousYearPeriodSales.reduce((acc: TSalesGraphReduced, current) => {
		const saleDate = new Date(current.dataVenda);
		const saleTime = saleDate.getTime();
		// Finding the correct - O(1) in average
		const bucket = previousYearPeriodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
		if (!bucket) return acc;

		// updating daily statistics
		const key = dayjs(bucket.key).format(groupingFormat);
		console.log("PREVIOUS", key);

		if (!acc[key]) acc[key] = { ATUAL: { qtde: 0, total: 0 }, ANTERIOR: { qtde: 0, total: 0 } };

		acc[key].ANTERIOR.qtde += Number(current.quantidade);
		acc[key].ANTERIOR.total += Number(current.valorTotal);
		return acc;
	}, currentPeriodSalesReduced);

	const salesGraph: TSalesGraphOutput = Object.entries(salesGraphReduced).map(([key, value], i, arr) => ({
		titulo: key,
		ANTERIOR: value.ANTERIOR,
		ATUAL: value.ATUAL,
		meta: salesGoal / arr.length,
	}));

	return salesGraph;
}

const handleGetStatsComparisonRoute: NextApiHandler<{
	data: TSalesGraphOutput;
}> = async (req, res) => {
	const session = await getUserSession({ request: req });
	const salesGraph = await fetchSalesGraph(req);

	return res.status(200).json({
		data: salesGraph,
	});
};

export default apiHandler({ POST: handleGetStatsComparisonRoute });

type GetSalesGroupedParams = {
	filters: TSalesGraphFilters;
};
async function getSalesGrouped({ filters }: GetSalesGroupedParams) {
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

		const salesResult = await db
			.select({
				dataVenda: sql<string>`date_trunc('day', ${sales.dataVenda})::text`,
				quantidade: sql<number>`count(*)`,
				valorTotal: sql<number>`sum(${sales.valorTotal})`,
			})
			.from(sales)
			.where(and(...conditions))
			.groupBy(sql`date_trunc('day', ${sales.dataVenda})`)
			.orderBy(sql`date_trunc('day', ${sales.dataVenda})`);

		return salesResult;
	} catch (error) {
		console.log("Error getting sales", error);
		throw error;
	}
}

type GetSalesGoalProps = {
	collection: Collection<TSaleGoal>;
	after: string;
	before: string;
};
async function getSalesGoal({ collection, after, before }: GetSalesGoalProps) {
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

// export type TSaleGraph = {
// 	chave: string;
// 	qtde: number;
// 	total: number;
// }[];

// const getSalesGraphStatsRoute: NextApiHandler<{ data: TSaleGraph }> = async (req, res) => {
// 	const filters = SalesGraphFilterSchema.parse(req.body);

// 	const sales = await getSales({ filters });
// 	const stats = sales.reduce(
// 		(acc: { [key: string]: { qtde: number; total: number } }, current) => {
// 			const total = current.itens
// 				.filter((item) => (filters.productGroups.length > 0 ? filters.productGroups.includes(item.produto.grupo) : true))
// 				.reduce((acc, item) => acc + item.valorVendaTotalLiquido, 0);

// 			if (filters.group === "DIA") {
// 				const saleDay = dayjs(current.dataVenda).format("DD/MM");
// 				acc[saleDay].qtde += 1;
// 				acc[saleDay].total += total;
// 			}
// 			if (filters.group === "MÊS") {
// 				const saleMonth = dayjs(current.dataVenda).month() + 1;
// 				acc[`${saleMonth}`].qtde += 1;
// 				acc[`${saleMonth}`].total += total;
// 			}
// 			if (filters.group === "BIMESTRE") {
// 				const saleBimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 2)}º`;
// 				acc[saleBimester].qtde += 1;
// 				acc[saleBimester].total += total;
// 			}
// 			if (filters.group === "TRIMESTRE") {
// 				const saleTrimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 3)}º`;
// 				acc[saleTrimester].qtde += 1;
// 				acc[saleTrimester].total += total;
// 			}
// 			if (filters.group === "SEMESTRE") {
// 				const saleTrimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 6)}º`;
// 				acc[saleTrimester].qtde += 1;
// 				acc[saleTrimester].total += total;
// 			}
// 			if (filters.group === "ANO") {
// 				const saleYear = dayjs(current.dataVenda).year();
// 				acc[saleYear].qtde += 1;
// 				acc[saleYear].total += total;
// 			}
// 			return acc;
// 		},
// 		getInitialGroupReduce({
// 			initialDate: filters.period.after,
// 			endDate: filters.period.before,
// 			group: filters.group,
// 		}),
// 	);

// 	return res.status(200).json({
// 		data: Object.entries(stats).map(([key, value]) => ({
// 			chave: key,
// 			...value,
// 		})),
// 	});
// };

// export default apiHandler({ POST: getSalesGraphStatsRoute });

// function getInitialGroupReduce({ initialDate, endDate, group }: { initialDate: string; endDate: string; group: TIntervalGrouping }): {
// 	[key: string]: { qtde: number; total: number };
// } {
// 	if (group === "DIA") {
// 		const datesStrs = getDayStringsBetweenDates({ initialDate, endDate });
// 		return datesStrs.reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
// 			acc[current] = { qtde: 0, total: 0 };
// 			return acc;
// 		}, {});
// 	}
// 	if (group === "MÊS") {
// 		return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].reduce(
// 			(acc: { [key: string]: { qtde: number; total: number } }, current) => {
// 				acc[current] = { qtde: 0, total: 0 };
// 				return acc;
// 			},
// 			{},
// 		);
// 	}
// 	if (group === "BIMESTRE") {
// 		return ["1º", "2º", "3º", "4º", "5º", "6º"].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
// 			acc[current] = { qtde: 0, total: 0 };
// 			return acc;
// 		}, {});
// 	}
// 	if (group === "TRIMESTRE") {
// 		return ["1º", "2º", "3º", "4º"].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
// 			acc[current] = { qtde: 0, total: 0 };
// 			return acc;
// 		}, {});
// 	}
// 	if (group === "SEMESTRE") {
// 		return ["1º", "2º"].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
// 			acc[current] = { qtde: 0, total: 0 };
// 			return acc;
// 		}, {});
// 	}
// 	if (group === "ANO") {
// 		const datesStrs = getYearStringsBetweenDates({ initialDate, endDate });

// 		return datesStrs.reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
// 			acc[current] = { qtde: 0, total: 0 };
// 			return acc;
// 		}, {});
// 	}
// 	return {};
// }

// type GetSalesParams = {
// 	filters: TSalesGraphFilters;
// };
// async function getSales({ filters }: GetSalesParams) {
// 	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
// 	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;
// 	try {
// 		const conditions = [];
// 		if (ajustedAfter) conditions.push(gte(sales.dataVenda, ajustedAfter));
// 		if (ajustedBefore) conditions.push(lte(sales.dataVenda, ajustedBefore));
// 		if (filters.total.min) conditions.push(gte(sales.valorTotal, filters.total.min));
// 		if (filters.total.max) conditions.push(gte(sales.valorTotal, filters.total.max));

// 		if (filters.saleNatures.length > 0) conditions.push(inArray(sales.natureza, filters.saleNatures));

// 		if (filters.sellers.length > 0) conditions.push(inArray(sales.vendedor, filters.sellers));

// 		if (filters.clientRFMTitles.length > 0)
// 			exists(
// 				db
// 					.select({ id: clients.id })
// 					.from(clients)
// 					.where(and(eq(clients.id, sales.clienteId), inArray(clients.analiseRFMTitulo, filters.clientRFMTitles))),
// 			);
// 		// How to apply filter for product groups present in sale ???

// 		// if (filters.productGroups.length > 0) {
// 		// 	conditions.push(
// 		// 		exists(
// 		// 			db
// 		// 				.select({ id: saleItems.id })
// 		// 				.from(saleItems)
// 		// 				.innerJoin(products, eq(saleItems.produtoId, products.id))
// 		// 				.where(
// 		// 					and(
// 		// 						// Aqui está a correção - correlacionando com a tabela externa
// 		// 						sql`${saleItems.vendaId} = ${sales.id}`,
// 		// 						inArray(products.grupo, filters.productGroups),
// 		// 					),
// 		// 				),
// 		// 		),
// 		// 	);
// 		// }
// 		if (filters.excludedSalesIds) conditions.push(notInArray(sales.id, filters.excludedSalesIds));

// 		const salesResult = await db.query.sales.findMany({
// 			where: and(...conditions),
// 			columns: {
// 				dataVenda: true,
// 			},
// 			with: {
// 				cliente: {
// 					columns: {
// 						nome: true,
// 					},
// 				},
// 				itens: {
// 					columns: {
// 						quantidade: true,
// 						valorVendaTotalLiquido: true,
// 						valorCustoTotal: true,
// 					},
// 					with: {
// 						produto: {
// 							columns: {
// 								descricao: true,
// 								grupo: true,
// 							},
// 						},
// 					},
// 				},
// 			},
// 		});

// 		return salesResult;
// 	} catch (error) {
// 		console.log("Error getting sales", error);
// 		throw error;
// 	}
// }
