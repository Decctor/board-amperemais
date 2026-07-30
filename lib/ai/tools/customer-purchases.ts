import { clients, products, saleItems, sales } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import z from "zod";
import { defineAgentTool } from "./define-tool";

/**
 * Consulta unificada de compras do cliente.
 *
 * Substitui as antigas `get_customer_purchase_history`, `get_customer_recent_purchases` e
 * `get_customer_insights`: as três eram a mesma consulta com defaults diferentes. Aqui, a
 * diferença entre "recentes" e "histórico" é um filtro de data, e entre "linhas" e "insights"
 * é a `visao`.
 *
 * `clienteId` e `organizacaoId` vêm do contexto — o modelo não pode consultar outro cliente
 * nem outra organização.
 */
export const customerPurchasesTool = defineAgentTool({
	name: "clientes.consultar_compras",
	description: `Consulta as compras do cliente com quem você está conversando.

Use visao="LISTA" (padrão) para ver as compras individuais com seus produtos, valores e datas.
Use visao="RESUMO" para obter estatísticas agregadas: total gasto, ticket médio, primeira e
última compra, grupos e produtos favoritos, e a análise RFM do cliente.

Filtros disponíveis (combináveis, todos opcionais):
- dataInicio / dataFim: recorte de período em ISO 8601 (ex.: "2026-01-01T00:00:00.000Z").
  Para "compras recentes", use dataInicio com a data de alguns meses atrás.
- produtoTermo: só compras que contenham um produto cujo nome ou código case com o termo.
- ordem: DATA_DESC (mais recentes primeiro, padrão), DATA_ASC ou VALOR_DESC (maiores compras).
- limite: quantas compras retornar (máximo 50).

A resposta traz "totalEncontrado" — se for maior que o limite, refine os filtros em vez de
pedir mais páginas.`,
	inputSchema: z.object({
		dataInicio: z.string().datetime().optional().describe("Considerar apenas compras a partir desta data (ISO 8601)."),
		dataFim: z.string().datetime().optional().describe("Considerar apenas compras até esta data (ISO 8601)."),
		produtoTermo: z.string().min(2).optional().describe("Filtra compras que contenham um produto com este nome ou código."),
		ordem: z.enum(["DATA_DESC", "DATA_ASC", "VALOR_DESC"]).optional().describe("Ordenação das compras. Padrão: DATA_DESC."),
		limite: z.number().int().min(1).max(50).optional().describe("Máximo de compras retornadas. Padrão: 10."),
		visao: z.enum(["LISTA", "RESUMO"]).optional().describe("LISTA para compras individuais, RESUMO para estatísticas agregadas."),
	}),
	async execute(input, context) {
		const { db, organizacaoId, chat } = context;
		const limit = input.limite ?? 10;
		const view = input.visao ?? "LISTA";

		const conditions = [eq(sales.organizacaoId, organizacaoId), eq(sales.clienteId, chat.clienteId)];
		if (input.dataInicio) conditions.push(gte(sales.dataVenda, new Date(input.dataInicio)));
		if (input.dataFim) conditions.push(lte(sales.dataVenda, new Date(input.dataFim)));

		// O filtro por produto é um semi-join: restringe as vendas àquelas que têm ao menos um
		// item cujo produto casa o termo (por nome ou código).
		if (input.produtoTermo) {
			const term = `%${input.produtoTermo}%`;
			const saleIds = db
				.selectDistinct({ vendaId: saleItems.vendaId })
				.from(saleItems)
				.innerJoin(products, eq(saleItems.produtoId, products.id))
				.where(
					and(
						eq(saleItems.organizacaoId, organizacaoId),
						eq(saleItems.clienteId, chat.clienteId),
						or(ilike(products.nome, term), ilike(products.codigo, term)),
					),
				);
			conditions.push(inArray(sales.id, saleIds));
		}

		const where = and(...conditions);

		const [totalRow] = await db.select({ total: count() }).from(sales).where(where);
		const totalEncontrado = Number(totalRow?.total ?? 0);

		if (totalEncontrado === 0) {
			return {
				success: true,
				message: "Nenhuma compra encontrada para este cliente com os filtros informados.",
				result: { totalEncontrado: 0, compras: [] },
			};
		}

		if (view === "RESUMO") {
			const [stats] = await db
				.select({
					totalCompras: count(),
					valorTotalGasto: sql<number>`COALESCE(SUM(${sales.valorTotal}), 0)`,
					ticketMedio: sql<number>`COALESCE(AVG(${sales.valorTotal}), 0)`,
					primeiraCompraData: sql<Date | null>`MIN(${sales.dataVenda})`,
					ultimaCompraData: sql<Date | null>`MAX(${sales.dataVenda})`,
				})
				.from(sales)
				.where(where);

			// Agregações por item respeitam o mesmo recorte de vendas.
			const saleIdsSubquery = db.select({ id: sales.id }).from(sales).where(where);

			const favoriteGroups = await db
				.select({
					grupo: products.grupo,
					quantidadeItens: count(),
					valorTotal: sql<number>`COALESCE(SUM(${saleItems.valorVendaTotalLiquido}), 0)`,
				})
				.from(saleItems)
				.innerJoin(products, eq(saleItems.produtoId, products.id))
				.where(and(eq(saleItems.organizacaoId, organizacaoId), inArray(saleItems.vendaId, saleIdsSubquery)))
				.groupBy(products.grupo)
				.orderBy(desc(sql`SUM(${saleItems.valorVendaTotalLiquido})`))
				.limit(5);

			const topProducts = await db
				.select({
					nome: products.nome,
					codigo: products.codigo,
					grupo: products.grupo,
					quantidadeTotal: sql<number>`COALESCE(SUM(${saleItems.quantidade}), 0)`,
					valorTotal: sql<number>`COALESCE(SUM(${saleItems.valorVendaTotalLiquido}), 0)`,
				})
				.from(saleItems)
				.innerJoin(products, eq(saleItems.produtoId, products.id))
				.where(and(eq(saleItems.organizacaoId, organizacaoId), inArray(saleItems.vendaId, saleIdsSubquery)))
				.groupBy(products.id, products.nome, products.codigo, products.grupo)
				.orderBy(desc(sql`SUM(${saleItems.valorVendaTotalLiquido})`))
				.limit(10);

			const client = await db.query.clients.findFirst({
				where: and(eq(clients.id, chat.clienteId), eq(clients.organizacaoId, organizacaoId)),
				columns: {
					analiseRFMTitulo: true,
					analiseRFMNotasRecencia: true,
					analiseRFMNotasFrequencia: true,
					analiseRFMNotasMonetario: true,
				},
			});

			return {
				success: true,
				message: `Resumo de ${totalEncontrado} compra(s) do cliente.`,
				result: {
					totalEncontrado,
					estatisticas: {
						totalCompras: Number(stats?.totalCompras ?? 0),
						valorTotalGasto: Number(stats?.valorTotalGasto ?? 0),
						ticketMedio: Number(stats?.ticketMedio ?? 0),
						primeiraCompraData: stats?.primeiraCompraData ?? null,
						ultimaCompraData: stats?.ultimaCompraData ?? null,
					},
					gruposFavoritos: favoriteGroups.map((g) => ({
						grupo: g.grupo,
						quantidadeItens: Number(g.quantidadeItens),
						valorTotal: Number(g.valorTotal),
					})),
					produtosMaisComprados: topProducts.map((p) => ({
						nome: p.nome,
						codigo: p.codigo,
						grupo: p.grupo,
						quantidadeTotal: Number(p.quantidadeTotal),
						valorTotal: Number(p.valorTotal),
					})),
					analiseRFM: client?.analiseRFMTitulo
						? {
								titulo: client.analiseRFMTitulo,
								recencia: client.analiseRFMNotasRecencia,
								frequencia: client.analiseRFMNotasFrequencia,
								monetario: client.analiseRFMNotasMonetario,
							}
						: null,
				},
			};
		}

		const orderBy =
			input.ordem === "DATA_ASC" ? [asc(sales.dataVenda)] : input.ordem === "VALOR_DESC" ? [desc(sales.valorTotal)] : [desc(sales.dataVenda)];

		const purchases = await db.query.sales.findMany({
			where,
			orderBy,
			limit,
			columns: {
				id: true,
				dataVenda: true,
				valorTotal: true,
				vendedorNome: true,
				documento: true,
				natureza: true,
				situacao: true,
			},
			with: {
				itens: {
					limit: 20,
					columns: { quantidade: true, valorVendaUnitario: true, valorVendaTotalLiquido: true },
					with: { produto: { columns: { nome: true, codigo: true, grupo: true } } },
				},
			},
		});

		return {
			success: true,
			message: `${purchases.length} de ${totalEncontrado} compra(s) retornada(s).`,
			result: {
				totalEncontrado,
				compras: purchases.map((sale) => ({
					dataVenda: sale.dataVenda,
					valorTotal: sale.valorTotal,
					vendedorNome: sale.vendedorNome,
					documento: sale.documento,
					situacao: sale.situacao,
					itens: sale.itens.map((item) => ({
						produto: item.produto?.nome ?? null,
						codigo: item.produto?.codigo ?? null,
						grupo: item.produto?.grupo ?? null,
						quantidade: item.quantidade,
						valorUnitario: item.valorVendaUnitario,
						valorTotal: item.valorVendaTotalLiquido,
					})),
				})),
			},
		};
	},
});
