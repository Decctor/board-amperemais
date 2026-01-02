import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { and, count, desc, eq, gte, inArray, lt, lte, notInArray, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

const GetClientsStatsInputSchema = z.object({
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
	rankingBy: z.enum(["purchases-total-qty", "purchases-total-value"]).optional().nullable(),
});

export type TGetClientsStatsInput = z.infer<typeof GetClientsStatsInputSchema>;

async function getClientsStats({ input, session }: { input: TGetClientsStatsInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET CLIENTS STATS] Starting:", {
		userOrg: userOrgId,
		input,
	});
	const conditions = [eq(sales.organizacaoId, userOrgId)];

	if (input.periodAfter) conditions.push(gte(sales.dataVenda, input.periodAfter));
	if (input.periodBefore) conditions.push(lte(sales.dataVenda, input.periodBefore));
	if (input.saleNatures && input.saleNatures.length > 0) conditions.push(inArray(sales.natureza, input.saleNatures));
	if (input.excludedSalesIds && input.excludedSalesIds.length > 0) conditions.push(notInArray(sales.id, input.excludedSalesIds));
	if (input.totalMin) conditions.push(gte(sales.valorTotal, input.totalMin));
	if (input.totalMax) conditions.push(lte(sales.valorTotal, input.totalMax));

	const [clientsTotalResult] = await db
		.select({
			count: count(),
		})
		.from(clients)
		.where(and(eq(clients.organizacaoId, userOrgId), input.periodBefore ? lte(clients.dataInsercao, input.periodBefore) : undefined));

	const clientsTotal = clientsTotalResult?.count ?? 0;

	const [newClientsTotalResult] = await db
		.select({
			count: count(),
		})
		.from(clients)
		.where(
			and(
				eq(clients.organizacaoId, userOrgId),
				input.periodAfter ? gte(clients.dataInsercao, input.periodAfter) : undefined,
				input.periodBefore ? lte(clients.dataInsercao, input.periodBefore) : undefined,
			),
		);
	const newClientsTotal = newClientsTotalResult?.count ?? 0;

	// FIX: Usar lt ao invés de lte
	const [recurringClientsTotalResult] = await db
		.select({
			count: count(),
		})
		.from(clients)
		.where(
			and(
				eq(clients.organizacaoId, userOrgId),
				// Cliente deve ter sido inserido ANTES do período começar
				input.periodAfter ? lt(clients.dataInsercao, input.periodAfter) : undefined,
				// Cliente deve ter feito compras no período filtrado
				inArray(
					clients.id,
					db
						.select({
							id: sales.clienteId,
						})
						.from(sales)
						.where(and(...conditions))
						.groupBy(sales.clienteId),
				),
			),
		);
	const recurringClientsTotal = recurringClientsTotalResult?.count ?? 0;

	const [newClientsRevenueResult] = await db
		.select({
			revenue: sum(sales.valorTotal),
		})
		.from(sales)
		.innerJoin(clients, eq(sales.clienteId, clients.id))
		.where(
			and(
				...conditions,
				// Cliente foi inserido no período filtrado
				input.periodAfter ? gte(clients.dataInsercao, input.periodAfter) : undefined,
				input.periodBefore ? lte(clients.dataInsercao, input.periodBefore) : undefined,
			),
		);
	const newClientsRevenue = newClientsRevenueResult?.revenue ? Number(newClientsRevenueResult.revenue) : 0;

	// Faturamento de clientes recorrentes
	const [recurringClientsRevenueResult] = await db
		.select({
			revenue: sum(sales.valorTotal),
		})
		.from(sales)
		.innerJoin(clients, eq(sales.clienteId, clients.id))
		.where(
			and(
				...conditions,
				// Cliente foi inserido ANTES do período começar
				input.periodAfter ? lt(clients.dataInsercao, input.periodAfter) : undefined,
			),
		);
	const recurringClientsRevenue = recurringClientsRevenueResult?.revenue ? Number(recurringClientsRevenueResult.revenue) : 0;

	// Ciclo médio de compra (tempo médio entre última e penúltima compra)
	const purchaseCycleResult = await db
		.select({
			clienteId: sales.clienteId,
			dataVenda: sales.dataVenda,
		})
		.from(sales)
		.where(and(...conditions))
		.orderBy(sales.clienteId, desc(sales.dataVenda));

	// Agrupar vendas por cliente e calcular diferença entre última e penúltima
	const clientPurchaseCycles: number[] = [];
	const clientPurchasesMap = new Map<string, Date[]>();

	// Agrupar vendas por cliente
	for (const sale of purchaseCycleResult) {
		if (!sale.clienteId || !sale.dataVenda) continue;

		if (!clientPurchasesMap.has(sale.clienteId)) {
			clientPurchasesMap.set(sale.clienteId, []);
		}
		clientPurchasesMap.get(sale.clienteId)!.push(sale.dataVenda);
	}

	// Calcular ciclo para cada cliente (apenas clientes com 2+ compras)
	for (const [_, dates] of clientPurchasesMap) {
		if (dates.length >= 2) {
			// Ordenar datas (mais recente primeiro, já vem assim da query)
			const lastPurchase = dates[0];
			const secondLastPurchase = dates[1];

			// Calcular diferença em dias
			const diffInMs = lastPurchase.getTime() - secondLastPurchase.getTime();
			const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

			clientPurchaseCycles.push(diffInDays);
		}
	}

	// Calcular média
	const averagePurchaseCycle =
		clientPurchaseCycles.length > 0 ? clientPurchaseCycles.reduce((acc, val) => acc + val, 0) / clientPurchaseCycles.length : null;

	let ranking: { clienteId: string; valor: number }[] = [];
	if (input.rankingBy === "purchases-total-qty") {
		ranking = (
			await db
				.select({
					clienteId: sales.clienteId,
					valor: count(sales.id),
				})
				.from(sales)
				.where(and(...conditions))
				.groupBy(sales.clienteId)
				.orderBy(desc(sql<number>`count(${sales.id})`))
				.limit(10)
		).map((item) => ({
			clienteId: item.clienteId,
			valor: item.valor ? Number(item.valor) : 0,
		}));
	}
	if (input.rankingBy === "purchases-total-value") {
		ranking = (
			await db
				.select({
					clienteId: sales.clienteId,
					valor: sum(sales.valorTotal),
				})
				.from(sales)
				.where(and(...conditions))
				.groupBy(sales.clienteId)
				.orderBy(desc(sql<number>`sum(${sales.valorTotal})`))
				.limit(10)
		).map((item) => ({
			clienteId: item.clienteId,
			valor: item.valor ? Number(item.valor) : 0,
		}));
	}

	return {
		data: {
			clientesTotais: {
				atual: clientsTotal,
			},
			clientesNovos: {
				atual: newClientsTotal,
			},
			clientesRecorrentes: {
				atual: recurringClientsTotal,
			},
			faturamentoNovosClientes: {
				atual: newClientsRevenue,
			},
			faturamentoClientesRecorrentes: {
				atual: recurringClientsRevenue,
			},
			cicloMedioCompra: {
				atual: averagePurchaseCycle,
			},
			ranking,
		},
	};
}
export type TGetClientsStatsOutput = Awaited<ReturnType<typeof getClientsStats>>;

const getClientsStatsRoute: NextApiHandler<TGetClientsStatsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetClientsStatsInputSchema.parse(req.query);
	const data = await getClientsStats({ input, session: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getClientsStatsRoute,
});
