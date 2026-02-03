import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import {
	getBestNumberOfPointsBetweenDates,
	getDateBuckets,
	getDayStringsBetweenDates,
	getEvenlySpacedDates,
	getYearStringsBetweenDates,
} from "@/lib/dates";
import { SalesGraphFilterSchema, type TSalesGraphFilters } from "@/schemas/query-params-utils";

import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, exists, gte, inArray, lte, notInArray, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
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
async function fetchSalesGraph(filters: TSalesGraphFilters, organizacaoId: string) {
	const currentPeriodAjusted = {
		after: new Date(filters.period.after),
		before: new Date(filters.period.before),
	};
	const previousYearPeriodAjusted = {
		after: dayjs(currentPeriodAjusted.after).subtract(1, "year").toDate(),
		before: dayjs(currentPeriodAjusted.before).subtract(1, "year").toDate(),
	};
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
		organizacaoId,
	});

	const salesGoal = await getSalesGoal({
		after: currentPeriodAjusted.after.toISOString(),
		before: currentPeriodAjusted.before.toISOString(),
		organizacaoId,
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
		organizacaoId,
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
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgMembership = sessionUser.membership;
	const userOrgId = userOrgMembership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const filters = SalesGraphFilterSchema.parse(req.body);

	const sessionUserResultsScope = userOrgMembership.permissoes.resultados.escopo;
	if (sessionUserResultsScope) {
		const scopeUsers = await db.query.organizationMembers.findMany({
			where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, userOrgId), inArray(fields.usuarioId, sessionUserResultsScope)),
			columns: { usuarioVendedorId: true },
		});
		const scopeUserSellerIds = scopeUsers.map((user) => user.usuarioVendedorId);

		// Checking if user is filtering for sellers outside his scope
		const isAttempingUnauthorizedScope = filters.sellers.some((sellerId) => !scopeUserSellerIds.includes(sellerId)) || filters.sellers.length === 0;
		if (isAttempingUnauthorizedScope) throw new createHttpError.Unauthorized("Você não tem permissão para acessar esse recurso.");
	}

	const salesGraph = await fetchSalesGraph(filters, userOrgId);

	return res.status(200).json({
		data: salesGraph,
	});
};

export default apiHandler({ POST: handleGetStatsComparisonRoute });

type GetSalesGroupedParams = {
	filters: TSalesGraphFilters;
	organizacaoId: string;
};
async function getSalesGrouped({ filters, organizacaoId }: GetSalesGroupedParams) {
	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;
	try {
		const conditions = [eq(sales.organizacaoId, organizacaoId)];
		if (ajustedAfter) conditions.push(gte(sales.dataVenda, ajustedAfter));
		if (ajustedBefore) conditions.push(lte(sales.dataVenda, ajustedBefore));
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
	after: string;
	before: string;
	organizacaoId: string;
};
async function getSalesGoal({ after, before, organizacaoId }: GetSalesGoalProps) {
	const ajustedAfter = after;
	const ajustedBefore = dayjs(before).endOf("day").toISOString();
	try {
		const goals = await db.query.goals.findMany({
			where: (fields, { and, or, gte, lte, eq }) =>
				and(
					eq(fields.organizacaoId, organizacaoId),
					or(
						and(gte(fields.dataInicio, new Date(ajustedAfter)), lte(fields.dataInicio, new Date(ajustedBefore))),
						and(gte(fields.dataFim, new Date(ajustedAfter)), lte(fields.dataFim, new Date(ajustedBefore))),
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
