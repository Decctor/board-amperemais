import { db } from "@/services/drizzle";
import { campaigns, cashbackProgramBalances, cashbackProgramTransactions, clients, products, saleItems, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, avg, count, desc, eq, gte, lt, sql, sum } from "drizzle-orm";
import { tool } from "ai";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// TOOL DEFINITIONS (read-only DB queries exposed to Claude)
// ═══════════════════════════════════════════════════════════════

export function buildAssistantTools(organizacaoId: string) {
	return {
		getSalesStats: tool({
			description:
				"Get sales statistics for the organization including total revenue, average ticket, and transaction count. Use this to answer questions about sales performance.",
			parameters: z.object({
				days: z.number().min(1).max(365).default(30).describe("Number of days to look back (default: 30)"),
			}),
			execute: async ({ days }) => {
				const since = dayjs().subtract(days, "days").toDate();
				const prevSince = dayjs().subtract(days * 2, "days").toDate();

				const [current, previous, topProducts] = await Promise.all([
					db
						.select({
							total: sum(sales.valorTotal),
							count: count(),
							avgTicket: avg(sales.valorTotal),
						})
						.from(sales)
						.where(and(eq(sales.organizacaoId, organizacaoId), gte(sales.dataVenda, since))),
					db
						.select({ total: sum(sales.valorTotal), count: count() })
						.from(sales)
						.where(and(eq(sales.organizacaoId, organizacaoId), gte(sales.dataVenda, prevSince), lt(sales.dataVenda, since))),
					db
						.select({
							nome: products.descricao,
							quantidade: sum(saleItems.quantidade),
							receita: sum(saleItems.valorVendaTotalLiquido),
						})
						.from(saleItems)
						.innerJoin(sales, eq(saleItems.vendaId, sales.id))
						.innerJoin(products, eq(saleItems.produtoId, products.id))
						.where(and(eq(sales.organizacaoId, organizacaoId), gte(sales.dataVenda, since)))
						.groupBy(products.id, products.descricao)
						.orderBy(desc(sum(saleItems.valorVendaTotalLiquido)))
						.limit(5),
				]);

				const currentTotal = Number(current[0]?.total) || 0;
				const previousTotal = Number(previous[0]?.total) || 0;
				const variacao = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

				return {
					periodo: `últimos ${days} dias`,
					receitaTotal: currentTotal,
					totalVendas: current[0]?.count || 0,
					ticketMedio: Number(current[0]?.avgTicket) || 0,
					variacaoReceita: Math.round(variacao * 10) / 10,
					tendencia: variacao > 5 ? "crescimento" : variacao < -5 ? "queda" : "estável",
					topProdutos: topProducts.map((p) => ({
						nome: p.nome,
						quantidade: Number(p.quantidade),
						receita: Number(p.receita),
					})),
				};
			},
		}),

		getTopClients: tool({
			description:
				"Get the top clients by total spend, with their RFM segment, purchase count, and contact info. Use this to identify your best customers or answer questions about client performance.",
			parameters: z.object({
				limit: z.number().min(1).max(20).default(10).describe("Number of clients to return"),
				rfmSegmento: z.string().optional().describe("Filter by RFM segment name (e.g. 'CAMPEÕES', 'EM RISCO')"),
			}),
			execute: async ({ limit, rfmSegmento }) => {
				const conditions = [eq(clients.organizacaoId, organizacaoId)];
				if (rfmSegmento) {
					conditions.push(sql`${clients.analiseRFMTitulo} ilike ${"%" + rfmSegmento + "%"}`);
				}

				const topClients = await db
					.select({
						id: clients.id,
						nome: clients.nome,
						telefone: clients.telefone,
						segmento: clients.analiseRFMTitulo,
						totalCompras: clients.metadataTotalCompras,
						valorTotalCompras: clients.metadataValorTotalCompras,
						ultimaCompra: clients.ultimaCompraData,
						primeiraCompra: clients.primeiraCompraData,
					})
					.from(clients)
					.where(and(...conditions))
					.orderBy(desc(clients.metadataValorTotalCompras))
					.limit(limit);

				return topClients.map((c) => ({
					...c,
					diasSemComprar: c.ultimaCompra ? dayjs().diff(dayjs(c.ultimaCompra), "days") : null,
				}));
			},
		}),

		getChurnRiskClients: tool({
			description:
				"Identify clients at risk of churning — customers who used to buy regularly but haven't purchased recently. Perfect for creating reactivation campaigns.",
			parameters: z.object({
				diasSemComprar: z.number().min(30).max(365).default(60).describe("Minimum days without a purchase to be considered at risk"),
				limit: z.number().min(1).max(50).default(20),
			}),
			execute: async ({ diasSemComprar, limit }) => {
				const cutoff = dayjs().subtract(diasSemComprar, "days").toDate();

				const atRisk = await db
					.select({
						id: clients.id,
						nome: clients.nome,
						telefone: clients.telefone,
						segmento: clients.analiseRFMTitulo,
						ultimaCompra: clients.ultimaCompraData,
						totalCompras: clients.metadataTotalCompras,
						valorTotalCompras: clients.metadataValorTotalCompras,
					})
					.from(clients)
					.where(
						and(
							eq(clients.organizacaoId, organizacaoId),
							lt(clients.ultimaCompraData, cutoff),
							sql`${clients.metadataTotalCompras} >= 2`, // Had at least 2 purchases (not one-time buyers)
						),
					)
					.orderBy(desc(clients.metadataValorTotalCompras))
					.limit(limit);

				return {
					total: atRisk.length,
					criterio: `sem compra há mais de ${diasSemComprar} dias`,
					clientes: atRisk.map((c) => ({
						...c,
						diasSemComprar: c.ultimaCompra ? dayjs().diff(dayjs(c.ultimaCompra), "days") : null,
					})),
				};
			},
		}),

		getRFMDistribution: tool({
			description: "Get the distribution of clients across RFM segments. Use this to understand the health of the customer base.",
			parameters: z.object({}),
			execute: async () => {
				const distribution = await db
					.select({
						segmento: clients.analiseRFMTitulo,
						total: count(),
						valorMedio: avg(clients.metadataValorTotalCompras),
					})
					.from(clients)
					.where(eq(clients.organizacaoId, organizacaoId))
					.groupBy(clients.analiseRFMTitulo)
					.orderBy(desc(count()));

				const totalClientes = distribution.reduce((acc, r) => acc + r.total, 0);

				return {
					totalClientes,
					segmentos: distribution.map((d) => ({
						segmento: d.segmento || "Sem segmento",
						total: d.total,
						percentual: totalClientes > 0 ? Math.round((d.total / totalClientes) * 100) : 0,
						valorMedio: Number(d.valorMedio) || 0,
					})),
				};
			},
		}),

		getCampaignPerformance: tool({
			description: "Get performance metrics for marketing campaigns including conversion rates and attributed revenue.",
			parameters: z.object({
				days: z.number().min(1).max(365).default(30),
			}),
			execute: async ({ days }) => {
				const since = dayjs().subtract(days, "days").toDate();

				const [activeCampaigns, conversions] = await Promise.all([
					db
						.select({
							id: campaigns.id,
							nome: campaigns.nome,
							ativo: campaigns.ativo,
						})
						.from(campaigns)
						.where(eq(campaigns.organizacaoId, organizacaoId))
						.limit(20),
					db
						.select({
							count: count(),
							receitaAtribuida: sum(sales.valorTotal),
						})
						.from(sales)
						.where(and(eq(sales.organizacaoId, organizacaoId), eq(sales.atribuicaoAplicavel, true), gte(sales.dataVenda, since))),
				]);

				return {
					periodo: `últimos ${days} dias`,
					campanhasAtivas: activeCampaigns.filter((c) => c.ativo).length,
					totalCampanhas: activeCampaigns.length,
					conversoesAtribuidas: conversions[0]?.count || 0,
					receitaAtribuida: Number(conversions[0]?.receitaAtribuida) || 0,
					campanhas: activeCampaigns.map((c) => ({ id: c.id, nome: c.nome, ativa: c.ativo })),
				};
			},
		}),

		getCashbackStats: tool({
			description: "Get cashback program statistics including outstanding balances, redemption rates, and top redeemers.",
			parameters: z.object({}),
			execute: async () => {
				const thirtyDaysAgo = dayjs().subtract(30, "days").toDate();

				const [balances, recentActivity] = await Promise.all([
					db
						.select({
							totalSaldo: sum(cashbackProgramBalances.saldoValorDisponivel),
							totalClientes: count(),
						})
						.from(cashbackProgramBalances)
						.innerJoin(clients, eq(cashbackProgramBalances.clienteId, clients.id))
						.where(eq(clients.organizacaoId, organizacaoId)),
					db
						.select({
							tipo: cashbackProgramTransactions.tipo,
							total: sum(cashbackProgramTransactions.valor),
							count: count(),
						})
						.from(cashbackProgramTransactions)
						.innerJoin(clients, eq(cashbackProgramTransactions.clienteId, clients.id))
						.where(and(eq(clients.organizacaoId, organizacaoId), gte(cashbackProgramTransactions.dataInsercao, thirtyDaysAgo)))
						.groupBy(cashbackProgramTransactions.tipo),
				]);

				return {
					saldoTotalEmAberto: Number(balances[0]?.totalSaldo) || 0,
					clientesComSaldo: balances[0]?.totalClientes || 0,
					atividadeUltimos30d: recentActivity.map((r) => ({
						tipo: r.tipo,
						totalValor: Number(r.total) || 0,
						totalTransacoes: r.count,
					})),
				};
			},
		}),
	};
}
