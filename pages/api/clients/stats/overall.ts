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
	saleNatures: z
		.array(
			z.string({
				invalid_type_error: "Tipo inválido para natureza de venda.",
			}),
		)
		.optional()
		.nullable(),
	excludedSalesIds: z
		.array(
			z.string({
				invalid_type_error: "Tipo inválido para ID da venda.",
			}),
		)
		.optional()
		.nullable(),
	totalMin: z
		.number({
			invalid_type_error: "Tipo inválido para valor mínimo da venda.",
		})
		.optional()
		.nullable(),
	totalMax: z
		.number({
			invalid_type_error: "Tipo inválido para valor máximo da venda.",
		})
		.optional()
		.nullable(),
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
	const saleConditions = [eq(sales.organizacaoId, userOrgId)];

	if (input.periodAfter) saleConditions.push(gte(sales.dataVenda, input.periodAfter));
	if (input.periodBefore) saleConditions.push(lte(sales.dataVenda, input.periodBefore));
	if (input.saleNatures && input.saleNatures.length > 0) saleConditions.push(inArray(sales.natureza, input.saleNatures));
	if (input.excludedSalesIds && input.excludedSalesIds.length > 0) saleConditions.push(notInArray(sales.id, input.excludedSalesIds));
	if (input.totalMin) saleConditions.push(gte(sales.valorTotal, input.totalMin));
	if (input.totalMax) saleConditions.push(lte(sales.valorTotal, input.totalMax));

	const totalClientsResult = await db
		.select({ count: count() })
		.from(clients)
		.where(and(eq(clients.organizacaoId, userOrgId), input.periodBefore ? lte(clients.primeiraCompraData, input.periodBefore) : undefined));

	const totalNewClientsResult = await db
		.select({ count: count() })
		.from(clients)
		.where(
			and(
				eq(clients.organizacaoId, userOrgId),
				input.periodAfter ? gte(clients.primeiraCompraData, input.periodAfter) : undefined,
				input.periodBefore ? lte(clients.primeiraCompraData, input.periodBefore) : undefined,
			),
		);

	// LTV: média do valor total de vendas por cliente dentro do período / filtros informados
	const salesByClient = await db
		.select({
			clienteId: sales.clienteId,
			totalVendasCliente: sum(sales.valorTotal),
		})
		.from(sales)
		.where(and(...saleConditions))
		.groupBy(sales.clienteId);

	const ltvClientsCount = salesByClient.length;
	const ltvTotal = salesByClient.reduce((acc, row) => acc + Number(row.totalVendasCliente ?? 0), 0);
	const ltvAverage = ltvClientsCount > 0 ? ltvTotal / ltvClientsCount : 0;

	// Lifetime médio (em dias) considerando primeira e última compra dos clientes no período
	const clientsForLifetime = await db
		.select({
			avgLifetimeDays: sql<number>`AVG(DATEDIFF(DAY, ${clients.primeiraCompraData}, ${clients.ultimaCompraData}))`,
		})
		.from(clients)
		.where(
			and(
				eq(clients.organizacaoId, userOrgId),
				input.periodAfter ? gte(clients.primeiraCompraData, input.periodAfter) : undefined,
				input.periodBefore ? lte(clients.primeiraCompraData, input.periodBefore) : undefined,
			),
		);

	return {
		data: {
			totalClients: totalClientsResult[0]?.count ?? 0,
			totalNewClients: totalNewClientsResult[0]?.count ?? 0,
			ltv: {
				average: ltvAverage,
				total: ltvTotal,
				clientsCount: ltvClientsCount,
			},
			avgLifetimeDays,
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
