import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { and, count, desc, eq, gte, inArray, lt, lte, notInArray, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

const GetClientsOverallStatsInputSchema = z.object({
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
});

export type TGetClientsOverallStatsInput = z.infer<typeof GetClientsOverallStatsInputSchema>;

async function getClientsOverallStats({ input, session }: { input: TGetClientsOverallStatsInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// Stats to get:
	// 1. Total clients count (up until the before period peram)
	// 2. Total new clients count (within the period param)
	// 3. LTV (within the period param)
	// 4. Avg lifetime (first sale to last sale) (within the period param)

	console.log("[INFO] [GET CLIENTS STATS] Starting:", {
		userOrg: userOrgId,
		input,
	});
	const { periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore } = input;
	const saleConditions = [eq(sales.organizacaoId, userOrgId), eq(sales.natureza, "SN01")];

	const totalClientsResult = await db
		.select({ count: count() })
		.from(clients)
		.where(and(eq(clients.organizacaoId, userOrgId), periodBefore ? lte(clients.primeiraCompraData, periodBefore) : undefined));

	const totalNewClientsResult = await db
		.select({ count: count() })
		.from(clients)
		.where(
			and(
				eq(clients.organizacaoId, userOrgId),
				periodAfter ? gte(clients.primeiraCompraData, periodAfter) : undefined,
				periodBefore ? lte(clients.primeiraCompraData, periodBefore) : undefined,
			),
		);
	// LTV: média do valor total de vendas por cliente dentro do período / filtros informados
	const salesByClient = await db
		.select({
			clienteId: sales.clienteId,
			totalVendasCliente: sum(sales.valorTotal),
		})
		.from(sales)
		.where(
			and(...saleConditions, periodAfter ? gte(sales.dataVenda, periodAfter) : undefined, periodBefore ? lte(sales.dataVenda, periodBefore) : undefined),
		)
		.groupBy(sales.clienteId);

	const ltvClientsCount = salesByClient.length;
	const ltvTotal = salesByClient.reduce((acc, row) => acc + Number(row.totalVendasCliente ?? 0), 0);
	const ltvAverage = ltvClientsCount > 0 ? ltvTotal / ltvClientsCount : 0;

	// Lifetime médio (em dias) considerando primeira e última compra dos clientes no período
	const avgLifetimeDaysResult = await db
		.select({
			avgLifetimeDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${clients.ultimaCompraData} - ${clients.primeiraCompraData})) / 86400)`,
		})
		.from(clients)
		.where(
			and(
				eq(clients.organizacaoId, userOrgId),
				periodAfter ? gte(clients.primeiraCompraData, periodAfter) : undefined,
				periodBefore ? lte(clients.primeiraCompraData, periodBefore) : undefined,
			),
		);

	const totalRevenueResult = await db
		.select({ total: sum(sales.valorTotal) })
		.from(sales)
		.where(
			and(...saleConditions, periodAfter ? gte(sales.dataVenda, periodAfter) : undefined, periodBefore ? lte(sales.dataVenda, periodBefore) : undefined),
		);
	const totalRevenue = Number(totalRevenueResult[0]?.total ?? 0);

	// Revenue from Existing Clients (first purchase BEFORE periodAfter)
	const existingClientsRevenueResult = await db
		.select({ total: sum(sales.valorTotal) })
		.from(sales)
		.innerJoin(clients, eq(sales.clienteId, clients.id))
		.where(
			and(
				...saleConditions,
				periodAfter ? gte(sales.dataVenda, periodAfter) : undefined,
				periodBefore ? lte(sales.dataVenda, periodBefore) : undefined,
				periodAfter ? lt(clients.primeiraCompraData, periodAfter) : undefined,
			),
		);

	// Revenue from New Clients (first purchase WITHIN periodAfter and periodBefore)
	const newClientsRevenueResult = await db
		.select({ total: sum(sales.valorTotal) })
		.from(sales)
		.innerJoin(clients, eq(sales.clienteId, clients.id))
		.where(
			and(
				...saleConditions,
				periodAfter ? gte(sales.dataVenda, periodAfter) : undefined,
				periodBefore ? lte(sales.dataVenda, periodBefore) : undefined,
				periodAfter ? gte(clients.primeiraCompraData, periodAfter) : undefined,
				periodBefore ? lte(clients.primeiraCompraData, periodBefore) : undefined,
			),
		);
	if (!comparingPeriodAfter && !comparingPeriodBefore) {
		return {
			data: {
				totalClients: {
					current: totalClientsResult[0]?.count ?? 0,
					comparison: null,
				},
				totalNewClients: {
					current: totalNewClientsResult[0]?.count ?? 0,
					comparison: null,
				},
				ltv: {
					current: ltvAverage,
					comparison: null,
				},
				avgLifetime: {
					current: avgLifetimeDaysResult[0]?.avgLifetimeDays ?? 0,
					comparison: null,
				},
				revenueFromRecurrentClients: {
					current: existingClientsRevenueResult[0]?.total ? Number(existingClientsRevenueResult[0]?.total) : 0,
					comparison: null,
					percentage:
						totalRevenue > 0 ? ((existingClientsRevenueResult[0]?.total ? Number(existingClientsRevenueResult[0]?.total) : 0) / totalRevenue) * 100 : 0,
				},
				revenueFromNewClients: {
					current: newClientsRevenueResult[0]?.total ? Number(newClientsRevenueResult[0]?.total) : 0,
					comparison: null,
					percentage: totalRevenue > 0 ? ((newClientsRevenueResult[0]?.total ? Number(newClientsRevenueResult[0]?.total) : 0) / totalRevenue) * 100 : 0,
				},
			},
		};
	}

	const comparisonTotalClientsResult = await db
		.select({ count: count() })
		.from(clients)
		.where(and(eq(clients.organizacaoId, userOrgId), comparingPeriodBefore ? lte(clients.primeiraCompraData, comparingPeriodBefore) : undefined));

	const comparisonTotalNewClientsResult = await db
		.select({ count: count() })
		.from(clients)
		.where(
			and(
				eq(clients.organizacaoId, userOrgId),
				comparingPeriodAfter ? gte(clients.primeiraCompraData, comparingPeriodAfter) : undefined,
				comparingPeriodBefore ? lte(clients.primeiraCompraData, comparingPeriodBefore) : undefined,
			),
		);
	// LTV: média do valor total de vendas por cliente dentro do período / filtros informados
	const comparisonSalesByClient = await db
		.select({
			clienteId: sales.clienteId,
			totalVendasCliente: sum(sales.valorTotal),
		})
		.from(sales)
		.where(
			and(
				...saleConditions,
				comparingPeriodAfter ? gte(sales.dataVenda, comparingPeriodAfter) : undefined,
				comparingPeriodBefore ? lte(sales.dataVenda, comparingPeriodBefore) : undefined,
			),
		)
		.groupBy(sales.clienteId);

	const comparisonLtvClientsCount = comparisonSalesByClient.length;
	const comparisonLtvTotal = comparisonSalesByClient.reduce((acc, row) => acc + Number(row.totalVendasCliente ?? 0), 0);
	const comparisonLtvAverage = comparisonLtvClientsCount > 0 ? comparisonLtvTotal / comparisonLtvClientsCount : 0;

	// Lifetime médio (em dias) considerando primeira e última compra dos clientes no período
	const comparisonAvgLifetimeDaysResult = await db
		.select({
			avgLifetimeDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${clients.ultimaCompraData} - ${clients.primeiraCompraData})) / 86400)`,
		})
		.from(clients)
		.where(
			and(
				eq(clients.organizacaoId, userOrgId),
				comparingPeriodAfter ? gte(clients.primeiraCompraData, comparingPeriodAfter) : undefined,
				comparingPeriodBefore ? lte(clients.primeiraCompraData, comparingPeriodBefore) : undefined,
			),
		);

	// Comparison Total Revenue
	const comparisonTotalRevenueResult = await db
		.select({ total: sum(sales.valorTotal) })
		.from(sales)
		.where(
			and(
				...saleConditions,
				comparingPeriodAfter ? gte(sales.dataVenda, comparingPeriodAfter) : undefined,
				comparingPeriodBefore ? lte(sales.dataVenda, comparingPeriodBefore) : undefined,
			),
		);
	const comparisonTotalRevenue = Number(comparisonTotalRevenueResult[0]?.total ?? 0);
	// Comparison Revenue from Existing Clients
	const comparisonExistingClientsRevenueResult = await db
		.select({ total: sum(sales.valorTotal) })
		.from(sales)
		.innerJoin(clients, eq(sales.clienteId, clients.id))
		.where(
			and(
				...saleConditions,
				comparingPeriodAfter ? gte(sales.dataVenda, comparingPeriodAfter) : undefined,
				comparingPeriodBefore ? lte(sales.dataVenda, comparingPeriodBefore) : undefined,
				comparingPeriodAfter ? lt(clients.primeiraCompraData, comparingPeriodAfter) : undefined,
			),
		);

	// Comparison Revenue from New Clients
	const comparisonNewClientsRevenueResult = await db
		.select({ total: sum(sales.valorTotal) })
		.from(sales)
		.innerJoin(clients, eq(sales.clienteId, clients.id))
		.where(
			and(
				...saleConditions,
				comparingPeriodAfter ? gte(sales.dataVenda, comparingPeriodAfter) : undefined,
				comparingPeriodBefore ? lte(sales.dataVenda, comparingPeriodBefore) : undefined,
				comparingPeriodAfter ? gte(clients.primeiraCompraData, comparingPeriodAfter) : undefined,
				comparingPeriodBefore ? lte(clients.primeiraCompraData, comparingPeriodBefore) : undefined,
			),
		);
	return {
		data: {
			totalClients: {
				current: totalClientsResult[0]?.count ?? 0,
				comparison: comparisonTotalClientsResult[0]?.count ?? 0,
			},
			totalNewClients: {
				current: totalNewClientsResult[0]?.count ?? 0,
				comparison: comparisonTotalNewClientsResult[0]?.count ?? 0,
			},
			ltv: {
				current: ltvAverage,
				comparison: comparisonLtvAverage,
			},
			avgLifetime: {
				current: avgLifetimeDaysResult[0]?.avgLifetimeDays ?? 0,
				comparison: comparisonAvgLifetimeDaysResult[0]?.avgLifetimeDays ?? 0,
			},
			revenueFromRecurrentClients: {
				current: existingClientsRevenueResult[0]?.total ? Number(existingClientsRevenueResult[0]?.total) : 0,
				comparison: comparisonExistingClientsRevenueResult[0]?.total ? Number(comparisonExistingClientsRevenueResult[0]?.total) : 0,
				percentage:
					comparisonTotalRevenue > 0
						? ((comparisonExistingClientsRevenueResult[0]?.total ? Number(comparisonExistingClientsRevenueResult[0]?.total) : 0) / comparisonTotalRevenue) *
							100
						: 0,
			},
			revenueFromNewClients: {
				current: newClientsRevenueResult[0]?.total ? Number(newClientsRevenueResult[0]?.total) : 0,
				comparison: comparisonNewClientsRevenueResult[0]?.total ? Number(comparisonNewClientsRevenueResult[0]?.total) : 0,
				percentage:
					comparisonTotalRevenue > 0
						? ((comparisonNewClientsRevenueResult[0]?.total ? Number(comparisonNewClientsRevenueResult[0]?.total) : 0) / comparisonTotalRevenue) * 100
						: 0,
			},
		},
	};
}
export type TGetClientsOverallStatsOutput = Awaited<ReturnType<typeof getClientsOverallStats>>;

const getClientsOverallStatsRoute: NextApiHandler<TGetClientsOverallStatsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetClientsOverallStatsInputSchema.parse(req.query);
	const data = await getClientsOverallStats({ input, session: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getClientsOverallStatsRoute,
});
