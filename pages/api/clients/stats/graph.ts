import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getBestNumberOfPointsBetweenDates, getDateBuckets, getEvenlySpacedDates } from "@/lib/dates";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, asc, countDistinct, eq, gte, lte, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetClientsGraphInputSchema = z.object({
	graphType: z.enum(["new-clients", "clients-growth", "active-clients"], {
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

export type TGetClientsGraphInput = z.infer<typeof GetClientsGraphInputSchema>;

async function getClientsGraph({ input, sessionUser }: { input: TGetClientsGraphInput; sessionUser: TAuthUserSession["user"] }) {
	const userOrgId = sessionUser.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const period = {
		after: input.periodAfter,
		before: input.periodBefore,
	};

	console.log(`[ORG: ${userOrgId}] [INFO] [GET CLIENTS GRAPH] Period:`, period);

	// If no start period, get the first client registration date
	if (!period.after) {
		const firstClient = await db
			.select({
				date: clients.primeiraCompraData,
			})
			.from(clients)
			.where(eq(clients.organizacaoId, userOrgId))
			.orderBy(asc(clients.primeiraCompraData))
			.limit(1);
		period.after = firstClient[0]?.date ?? undefined;
		if (!period.after) throw new createHttpError.BadRequest("Não foi possível encontrar o primeiro cliente cadastrado.");
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

	// Graph Type: new-clients (non-cumulative, new clients per period)
	if (input.graphType === "new-clients") {
		const newClients = await db
			.select({
				date: sql<string>`date_trunc('day', ${clients.primeiraCompraData})::text`,
				total: sql<number>`COUNT(*)`,
			})
			.from(clients)
			.where(and(eq(clients.organizacaoId, userOrgId), gte(clients.primeiraCompraData, period.after), lte(clients.primeiraCompraData, period.before)))
			.orderBy(sql`date_trunc('day', ${clients.primeiraCompraData})`)
			.groupBy(sql`date_trunc('day', ${clients.primeiraCompraData})`);

		const initialNewClients = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const newClientsReduced = newClients.reduce((acc, current) => {
			const clientDate = new Date(current.date);
			const clientTime = clientDate.getTime();

			const bucket = periodDateBuckets.find((b) => clientTime >= b.start && clientTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total);
			return acc;
		}, initialNewClients);

		const newClientsGraph = Object.entries(newClientsReduced).map(([key, value]) => ({
			label: key,
			value: value.value,
		}));

		return {
			data: newClientsGraph,
		};
	}

	// Graph Type: clients-growth (cumulative, total clients over time)
	if (input.graphType === "clients-growth") {
		// Get total clients BEFORE the period starts
		const clientsBeforePeriod = await db
			.select({
				total: sql<number>`COUNT(*)`,
			})
			.from(clients)
			.where(and(eq(clients.organizacaoId, userOrgId), lte(clients.primeiraCompraData, period.after)));

		const initialTotal = Number(clientsBeforePeriod[0]?.total || 0);

		const clientsGrowth = await db
			.select({
				date: sql<string>`date_trunc('day', ${clients.primeiraCompraData})::text`,
				total: sql<number>`COUNT(*)`,
			})
			.from(clients)
			.where(and(eq(clients.organizacaoId, userOrgId), gte(clients.primeiraCompraData, period.after), lte(clients.primeiraCompraData, period.before)))
			.orderBy(sql`date_trunc('day', ${clients.primeiraCompraData})`)
			.groupBy(sql`date_trunc('day', ${clients.primeiraCompraData})`);

		const initialClientsGrowth = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const clientsGrowthReduced = clientsGrowth.reduce((acc, current) => {
			const clientDate = new Date(current.date);
			const clientTime = clientDate.getTime();

			const bucket = periodDateBuckets.find((b) => clientTime >= b.start && clientTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total);
			return acc;
		}, initialClientsGrowth);

		// Transform into cumulative values
		let accumulated = initialTotal;
		const clientsGrowthGraph = Object.entries(clientsGrowthReduced).map(([key, value]) => {
			accumulated += value.value;
			return {
				label: key,
				value: accumulated,
			};
		});

		return {
			data: clientsGrowthGraph,
		};
	}

	// Graph Type: active-clients (clients who made purchases in the period)
	if (input.graphType === "active-clients") {
		const activeClients = await db
			.select({
				date: sql<string>`date_trunc('day', ${sales.dataVenda})::text`,
				total: countDistinct(sales.clienteId),
			})
			.from(sales)
			.where(
				and(eq(sales.organizacaoId, userOrgId), gte(sales.dataVenda, period.after), lte(sales.dataVenda, period.before), eq(sales.natureza, "SN01")),
			)
			.orderBy(sql`date_trunc('day', ${sales.dataVenda})`)
			.groupBy(sql`date_trunc('day', ${sales.dataVenda})`);

		const initialActiveClients = Object.fromEntries(periodDatesStrs.map((date) => [dayjs(date).format(groupingFormat), { value: 0 }]));

		const activeClientsReduced = activeClients.reduce((acc, current) => {
			const saleDate = new Date(current.date);
			const saleTime = saleDate.getTime();

			const bucket = periodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);
			if (!bucket) return acc;

			const key = dayjs(bucket.key).format(groupingFormat);
			if (!acc[key]) acc[key] = { value: 0 };

			acc[key].value += Number(current.total);
			return acc;
		}, initialActiveClients);

		const activeClientsGraph = Object.entries(activeClientsReduced).map(([key, value]) => ({
			label: key,
			value: value.value,
		}));

		return {
			data: activeClientsGraph,
		};
	}

	return {
		data: [],
	};
}

export type TGetClientsGraphOutput = Awaited<ReturnType<typeof getClientsGraph>>;

const getClientsGraphRoute: NextApiHandler<TGetClientsGraphOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetClientsGraphInputSchema.parse({
		graphType: req.query.graphType as "new-clients" | "clients-growth" | "active-clients",
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
	});

	const result = await getClientsGraph({ input, sessionUser: sessionUser.user });
	return res.status(200).json(result);
};

export default apiHandler({
	GET: getClientsGraphRoute,
});
