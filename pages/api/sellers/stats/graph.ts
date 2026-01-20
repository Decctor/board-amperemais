import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getBestNumberOfPointsBetweenDates, getDateBuckets, getEvenlySpacedDates } from "@/lib/dates";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, countDistinct, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetSellersGraphInputSchema = z.object({
	graphType: z.enum(["sales-value", "sales-quantity", "active-sellers", "average-ticket"], {
		required_error: "Tipo de gráfico não informado.",
		invalid_type_error: "Tipo inválido para tipo de gráfico.",
	}),
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Formato de data inválido." })
		.optional()
		.nullable()
		.transform((v) => (v ? dayjs(v).startOf("day").toDate() : undefined)),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Formato de data inválido." })
		.optional()
		.nullable()
		.transform((v) => (v ? dayjs(v).endOf("day").toDate() : undefined)),
});

export type TGetSellersGraphInput = z.infer<typeof GetSellersGraphInputSchema>;

async function getSellersGraph({ input, sessionUser }: { input: TGetSellersGraphInput; sessionUser: TAuthUserSession }) {
	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const period = {
		after: input.periodAfter,
		before: input.periodBefore,
	};

	console.log(`[ORG: ${userOrgId}] [INFO] [GET SELLERS GRAPH] Period:`, period);

	// If no start period, get the first sale date
	if (!period.after) {
		const firstSale = await db
			.select({
				date: sales.dataVenda,
			})
			.from(sales)
			.where(and(eq(sales.organizacaoId, userOrgId), eq(sales.natureza, "SN01")))
			.orderBy(sql`${sales.dataVenda} asc`)
			.limit(1);
		period.after = firstSale[0]?.date ?? undefined;
		if (!period.after) throw new createHttpError.BadRequest("Não foi possível encontrar a primeira venda cadastrada.");
	}

	if (!period.before) {
		period.before = new Date();
	}

	const { points: bestNumberOfPointsForPeriodsDates, groupingFormat } = getBestNumberOfPointsBetweenDates({
		startDate: period.after,
		endDate: period.before,
	});

	const periodDatesStrs = getEvenlySpacedDates({
		startDate: period.after,
		endDate: period.before,
		points: bestNumberOfPointsForPeriodsDates,
	});

	const periodDateBuckets = getDateBuckets(periodDatesStrs);

	// Graph Type: sales-value (total revenue over time)
	if (input.graphType === "sales-value") {
		const salesValue = await db
			.select({
				date: sql<string>`date_trunc('day', ${sales.dataVenda})::text`,
				total: sql<number>`SUM(${sales.valorTotal})`,
			})
			.from(sales)
			.where(
				and(
					eq(sales.organizacaoId, userOrgId),
					isNotNull(sales.dataVenda),
					gte(sales.dataVenda, period.after),
					lte(sales.dataVenda, period.before),
					eq(sales.natureza, "SN01"),
				),
			)
			.orderBy(sql`date_trunc('day', ${sales.dataVenda})`)
			.groupBy(sql`date_trunc('day', ${sales.dataVenda})`);

		const initialSalesValue = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const salesValueReduced = salesValue.reduce((acc, current) => {
			const saleDate = new Date(current.date);
			const saleTime = saleDate.getTime();

			const bucket = periodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total ?? 0);
			return acc;
		}, initialSalesValue);

		const salesValueGraph = Object.entries(salesValueReduced).map(([key, value]) => ({
			label: key,
			value: value.value,
		}));

		return {
			data: salesValueGraph,
		};
	}

	// Graph Type: sales-quantity (total sales count over time)
	if (input.graphType === "sales-quantity") {
		const salesQuantity = await db
			.select({
				date: sql<string>`date_trunc('day', ${sales.dataVenda})::text`,
				total: sql<number>`COUNT(${sales.id})`,
			})
			.from(sales)
			.where(
				and(
					eq(sales.organizacaoId, userOrgId),
					isNotNull(sales.dataVenda),
					gte(sales.dataVenda, period.after),
					lte(sales.dataVenda, period.before),
					eq(sales.natureza, "SN01"),
				),
			)
			.orderBy(sql`date_trunc('day', ${sales.dataVenda})`)
			.groupBy(sql`date_trunc('day', ${sales.dataVenda})`);

		const initialSalesQuantity = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const salesQuantityReduced = salesQuantity.reduce((acc, current) => {
			const saleDate = new Date(current.date);
			const saleTime = saleDate.getTime();

			const bucket = periodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total ?? 0);
			return acc;
		}, initialSalesQuantity);

		const salesQuantityGraph = Object.entries(salesQuantityReduced).map(([key, value]) => ({
			label: key,
			value: value.value,
		}));

		return {
			data: salesQuantityGraph,
		};
	}

	// Graph Type: active-sellers (unique sellers who sold per period)
	if (input.graphType === "active-sellers") {
		const activeSellers = await db
			.select({
				date: sql<string>`date_trunc('day', ${sales.dataVenda})::text`,
				total: countDistinct(sales.vendedorId),
			})
			.from(sales)
			.where(
				and(
					eq(sales.organizacaoId, userOrgId),
					isNotNull(sales.dataVenda),
					isNotNull(sales.vendedorId),
					gte(sales.dataVenda, period.after),
					lte(sales.dataVenda, period.before),
					eq(sales.natureza, "SN01"),
				),
			)
			.orderBy(sql`date_trunc('day', ${sales.dataVenda})`)
			.groupBy(sql`date_trunc('day', ${sales.dataVenda})`);

		const initialActiveSellers = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const activeSellersReduced = activeSellers.reduce((acc, current) => {
			const saleDate = new Date(current.date);
			const saleTime = saleDate.getTime();

			const bucket = periodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total);
			return acc;
		}, initialActiveSellers);

		const activeSellersGraph = Object.entries(activeSellersReduced).map(([key, value]) => ({
			label: key,
			value: value.value,
		}));

		return {
			data: activeSellersGraph,
		};
	}

	// Graph Type: average-ticket (average ticket value over time)
	if (input.graphType === "average-ticket") {
		const ticketData = await db
			.select({
				date: sql<string>`date_trunc('day', ${sales.dataVenda})::text`,
				totalRevenue: sql<number>`SUM(${sales.valorTotal})`,
				salesCount: sql<number>`COUNT(${sales.id})`,
			})
			.from(sales)
			.where(
				and(
					eq(sales.organizacaoId, userOrgId),
					isNotNull(sales.dataVenda),
					gte(sales.dataVenda, period.after),
					lte(sales.dataVenda, period.before),
					eq(sales.natureza, "SN01"),
				),
			)
			.orderBy(sql`date_trunc('day', ${sales.dataVenda})`)
			.groupBy(sql`date_trunc('day', ${sales.dataVenda})`);

		const initialTicket = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { revenue: 0, count: 0 }]));

		const ticketReduced = ticketData.reduce((acc, current) => {
			const saleDate = new Date(current.date);
			const saleTime = saleDate.getTime();

			const bucket = periodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { revenue: 0, count: 0 };

			acc[key].revenue += Number(current.totalRevenue ?? 0);
			acc[key].count += Number(current.salesCount ?? 0);
			return acc;
		}, initialTicket);

		const ticketGraph = Object.entries(ticketReduced).map(([key, value]) => {
			const averageTicket = value.count > 0 ? value.revenue / value.count : 0;
			return {
				label: key,
				value: averageTicket,
			};
		});

		return {
			data: ticketGraph,
		};
	}

	return {
		data: [],
	};
}

export type TGetSellersGraphOutput = Awaited<ReturnType<typeof getSellersGraph>>;

const getSellersGraphRoute: NextApiHandler<TGetSellersGraphOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetSellersGraphInputSchema.parse({
		graphType: req.query.graphType as "sales-value" | "sales-quantity" | "active-sellers" | "average-ticket",
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
	});

	const result = await getSellersGraph({ input, sessionUser });
	return res.status(200).json(result);
};

export default apiHandler({
	GET: getSellersGraphRoute,
});
