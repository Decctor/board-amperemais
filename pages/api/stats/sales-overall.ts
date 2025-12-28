import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { SalesGeneralStatsFiltersSchema, type TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import { db } from "@/services/drizzle";
import { clients, saleItems, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, exists, gte, inArray, lte, notInArray, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";

type TOverallSalesStatsReduced = {
	faturamentoBruto: number;
	gastoBruto: number;
	qtdeVendas: number;
	qtdeItensVendidos: number;
};

export type TOverallSalesStats = {
	faturamentoMeta: number;
	faturamentoMetaPorcentagem: number;
	faturamento: {
		atual: number;
		anterior: number | undefined;
	};
	margemBruta: {
		atual: number;
		anterior: number | undefined;
	};
	qtdeVendas: {
		atual: number;
		anterior: number | undefined;
	};
	ticketMedio: {
		atual: number;
		anterior: number | undefined;
	};
	qtdeItensVendidos: {
		atual: number;
		anterior: number | undefined;
	};
	itensPorVendaMedio: {
		atual: number;
		anterior: number | undefined;
	};
	valorDiarioVendido: {
		atual: number;
		anterior: number | undefined;
	};
};
type GetResponse = {
	data: TOverallSalesStats;
};
const getSalesOverallStatsRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const filters = SalesGeneralStatsFiltersSchema.parse(req.body);
	console.log("[INFO] [GET_SALES_OVERALL_STATS] Filters payload: ", filters);

	// const sales = await getSales({ filters });
	const overallSaleGoal = await getOverallSaleGoal({
		after: filters.period.after,
		before: filters.period.before,
		organizacaoId: userOrgId,
	});

	// const stats = sales.reduce(
	// 	(acc: TOverallSalesStatsReduced, current) => {
	// 		// updating sales quantity stats
	// 		acc.qtdeVendas += 1;

	// 		const applicableItems = current.itens.filter((item) =>
	// 			filters.productGroups.length > 0 ? filters.productGroups.includes(item.produto.grupo) : true,
	// 		);
	// 		for (const item of applicableItems) {
	// 			acc.qtdeItensVendidos += item.quantidade;
	// 			acc.gastoBruto += item.valorCustoTotal;
	// 			acc.faturamentoBruto += item.valorVendaTotalLiquido;
	// 		}
	// 		return acc;
	// 	},
	// 	{
	// 		faturamentoBruto: 0,
	// 		gastoBruto: 0,
	// 		qtdeVendas: 0,
	// 		qtdeItensVendidos: 0,
	// 	} as TOverallSalesStatsReduced,
	// );

	const stats = await getOverallStats(filters, userOrgId);
	const overallStats: TOverallSalesStats = {
		faturamentoMetaPorcentagem: (stats.faturamento.atual / overallSaleGoal) * 100,
		faturamento: stats.faturamento,
		margemBruta: stats.margemBruta,
		faturamentoMeta: overallSaleGoal,
		qtdeVendas: stats.qtdeVendas,
		ticketMedio: stats.ticketMedio,
		qtdeItensVendidos: stats.qtdeItensVendidos,
		itensPorVendaMedio: stats.itensPorVendaMedio,
		valorDiarioVendido: stats.valorDiarioVendido,
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

	try {
		const conditions = [];

		if (ajustedAfter) conditions.push(gte(sales.dataVenda, ajustedAfter));
		if (ajustedBefore) conditions.push(lte(sales.dataVenda, ajustedBefore));
		if (filters.total.min) conditions.push(gte(sales.valorTotal, filters.total.min));
		if (filters.total.max) conditions.push(gte(sales.valorTotal, filters.total.max));

		if (filters.saleNatures.length > 0) conditions.push(inArray(sales.natureza, filters.saleNatures));

		if (filters.sellers.length > 0) conditions.push(inArray(sales.vendedorNome, filters.sellers));

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
	after: string;
	before: string;
	organizacaoId: string;
};
async function getOverallSaleGoal({ after, before, organizacaoId }: GetOverallSaleGoalProps) {
	const ajustedAfter = dayjs(after).toDate();
	const ajustedBefore = dayjs(before).endOf("day").toDate();
	try {
		const goals = await db.query.goals.findMany({
			where: (fields, { and, or, gte, lte, eq }) =>
				and(
					eq(fields.organizacaoId, organizacaoId),
					or(
						and(gte(fields.dataInicio, ajustedAfter), lte(fields.dataInicio, ajustedBefore)),
						and(gte(fields.dataFim, ajustedAfter), lte(fields.dataFim, ajustedBefore)),
					),
				),
		});

		console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goals: ", goals);
		const applicableSaleGoal = goals.reduce((acc, current) => {
			const afterDatetime = new Date(after).getTime();
			const beforeDatetime = new Date(before).getTime();

			const monthStartDatetime = new Date(current.dataInicio).getTime();
			const monthEndDatetime = new Date(current.dataFim).getTime();

			const days = Math.abs(dayjs(current.dataFim).diff(dayjs(current.dataInicio), "days")) + 1;

			if (
				(afterDatetime < monthStartDatetime && beforeDatetime < monthStartDatetime) ||
				(afterDatetime > monthEndDatetime && beforeDatetime > monthEndDatetime)
			) {
				console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goal not applicable: ", { current });
				return acc;
			}
			if (afterDatetime <= monthStartDatetime && beforeDatetime >= monthEndDatetime) {
				// Caso o período de filtro da query compreenda o mês inteiro
				console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goal applicable for all period: ", { current });
				return acc + current.objetivoValor;
			}
			if (beforeDatetime > monthEndDatetime) {
				const applicableDays = dayjs(current.dataFim).diff(dayjs(after), "days");

				console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goal applicable for partial period: ", { current, applicableDays, days });
				return acc + (current.objetivoValor * applicableDays) / days;
			}

			const applicableDays = dayjs(before).diff(dayjs(current.dataInicio), "days") + 1;

			console.log("[INFO] [GET_OVERALL_SALE_GOAL] Goal applicable for partial period: ", { current, applicableDays, days });

			return acc + (current.objetivoValor * applicableDays) / days;
		}, 0);

		return applicableSaleGoal;
	} catch (error) {
		console.log("Error getting overall sale goal", error);
		throw error;
	}
}

export async function getOverallStats(filters: TSaleStatsGeneralQueryParams, organizacaoId: string) {
	const conditions = [eq(sales.organizacaoId, organizacaoId)];

	if (filters.total.min) conditions.push(gte(sales.valorTotal, filters.total.min));
	if (filters.total.max) conditions.push(gte(sales.valorTotal, filters.total.max));
	if (filters.saleNatures.length > 0) conditions.push(inArray(sales.natureza, filters.saleNatures));
	if (filters.sellers.length > 0) conditions.push(inArray(sales.vendedorNome, filters.sellers));
	if (filters.clientRFMTitles.length > 0)
		conditions.push(
			exists(
				db
					.select({ id: clients.id })
					.from(clients)
					.where(
						and(eq(clients.organizacaoId, organizacaoId), eq(clients.id, sales.clienteId), inArray(clients.analiseRFMTitulo, filters.clientRFMTitles)),
					),
			),
		);
	if (filters.excludedSalesIds) conditions.push(notInArray(sales.id, filters.excludedSalesIds));

	const totalSalesStatsResult = await db
		.select({
			qtde: count(sales.id),
			valorTotal: sum(sales.valorTotal),
			custoTotal: sum(sales.custoTotal),
		})
		.from(sales)
		.where(
			and(
				...conditions,
				filters.period.after ? gte(sales.dataVenda, new Date(filters.period.after)) : undefined,
				filters.period.before ? lte(sales.dataVenda, new Date(filters.period.before)) : undefined,
			),
		);

	const totalSalesStats = totalSalesStatsResult[0];

	const totalSalesQty = totalSalesStats.qtde;
	const totalSalesValorTotal = totalSalesStats.valorTotal ? Number(totalSalesStats.valorTotal) : 0;
	const totalSalesCustoTotal = totalSalesStats.custoTotal ? Number(totalSalesStats.custoTotal) : 0;

	const totalSalesItemsStatsResult = await db
		.select({
			total: sum(saleItems.quantidade),
		})
		.from(saleItems)
		.where(
			and(
				eq(saleItems.organizacaoId, organizacaoId),
				inArray(
					saleItems.vendaId,
					db
						.select({ id: sales.id })
						.from(sales)
						.where(
							and(
								...conditions,
								filters.period.after ? gte(sales.dataVenda, new Date(filters.period.after)) : undefined,
								filters.period.before ? lte(sales.dataVenda, new Date(filters.period.before)) : undefined,
							),
						),
				),
			),
		);

	const totalSalesItemsStats = totalSalesItemsStatsResult[0];
	const totalSalesItemsQty = totalSalesItemsStats.total ? Number(totalSalesItemsStats.total) : 0;

	if (!filters.period.after && !filters.period.before) {
		return {
			faturamento: {
				atual: totalSalesValorTotal,
				anterior: undefined,
			},
			margemBruta: {
				atual: totalSalesValorTotal - totalSalesCustoTotal,
				anterior: undefined,
			},
			qtdeVendas: {
				atual: totalSalesQty,
				anterior: undefined,
			},
			qtdeItensVendidos: {
				atual: totalSalesItemsQty,
				anterior: undefined,
			},
			itensPorVendaMedio: {
				atual: totalSalesItemsQty / totalSalesQty,
				anterior: undefined,
			},
			ticketMedio: {
				atual: totalSalesValorTotal / totalSalesQty,
				anterior: undefined,
			},
			valorDiarioVendido: {
				atual: totalSalesValorTotal / dayjs(filters.period.before).diff(dayjs(filters.period.after), "days"),
				anterior: undefined,
			},
		};
	}

	const dateDiff = dayjs(filters.period.before).diff(dayjs(filters.period.after), "days");
	const previousPeriodAfter = dayjs(filters.period.after).subtract(dateDiff, "days").toDate();
	const previousPeriodBefore = dayjs(filters.period.before).subtract(dateDiff, "days").toDate();

	const previousTotalSalesStatsResult = await db
		.select({
			qtde: count(sales.id),
			valorTotal: sum(sales.valorTotal),
			custoTotal: sum(sales.custoTotal),
		})
		.from(sales)
		.where(and(...conditions, gte(sales.dataVenda, previousPeriodAfter), lte(sales.dataVenda, previousPeriodBefore)));

	const previousTotalSalesStats = previousTotalSalesStatsResult[0];

	const previousTotalSalesQty = previousTotalSalesStats.qtde;
	const previousTotalSalesValorTotal = previousTotalSalesStats.valorTotal ? Number(previousTotalSalesStats.valorTotal) : 0;
	const previousTotalSalesCustoTotal = previousTotalSalesStats.custoTotal ? Number(previousTotalSalesStats.custoTotal) : 0;

	const previousTotalSalesItemsStatsResult = await db
		.select({
			total: sum(saleItems.quantidade),
		})
		.from(saleItems)
		.where(
			and(
				eq(saleItems.organizacaoId, organizacaoId),
				inArray(
					saleItems.vendaId,
					db
						.select({ id: sales.id })
						.from(sales)
						.where(and(...conditions, gte(sales.dataVenda, previousPeriodAfter), lte(sales.dataVenda, previousPeriodBefore))),
				),
			),
		);

	const previousTotalSalesItemsStats = previousTotalSalesItemsStatsResult[0];
	const previousTotalSalesItemsQty = previousTotalSalesItemsStats.total ? Number(previousTotalSalesItemsStats.total) : 0;

	return {
		faturamento: {
			atual: totalSalesValorTotal,
			anterior: previousTotalSalesValorTotal,
		},
		margemBruta: {
			atual: totalSalesValorTotal - totalSalesCustoTotal,
			anterior: previousTotalSalesValorTotal - previousTotalSalesCustoTotal,
		},
		qtdeVendas: {
			atual: totalSalesQty,
			anterior: previousTotalSalesQty,
		},
		qtdeItensVendidos: {
			atual: totalSalesItemsQty,
			anterior: previousTotalSalesItemsQty,
		},
		itensPorVendaMedio: {
			atual: totalSalesItemsQty / totalSalesQty,
			anterior: previousTotalSalesItemsQty / previousTotalSalesQty,
		},
		ticketMedio: {
			atual: totalSalesValorTotal / totalSalesQty,
			anterior: previousTotalSalesValorTotal / previousTotalSalesQty,
		},
		valorDiarioVendido: {
			atual: totalSalesValorTotal / dateDiff,
			anterior: previousTotalSalesValorTotal / dateDiff,
		},
	};
}
