import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales } from "@/services/drizzle/schema";
import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";

// ============================================================================
// Customer Purchase History Tools
// ============================================================================

interface GetCustomerPurchaseHistoryOptions {
	limit?: number;
	startDate?: Date;
	endDate?: Date;
}

export async function getCustomerPurchaseHistory(clientId: string, options: GetCustomerPurchaseHistoryOptions = {}) {
	const { limit = 20, startDate, endDate } = options;

	try {
		console.log("[INFO] [DATABASE_TOOLS] [GET_CUSTOMER_PURCHASE_HISTORY] Params:", { clientId, limit, startDate, endDate });
		const conditions = [eq(sales.clienteId, clientId)];

		if (startDate) {
			conditions.push(gte(sales.dataVenda, startDate));
		}
		if (endDate) {
			conditions.push(lte(sales.dataVenda, endDate));
		}

		const purchaseHistory = await db.query.sales.findMany({
			where: and(...conditions),
			orderBy: [desc(sales.dataVenda)],
			limit,
			with: {
				itens: {
					with: {
						produto: true,
					},
				},
			},
		});

		return {
			success: true,
			data: purchaseHistory.map((sale) => ({
				id: sale.id,
				dataVenda: sale.dataVenda,
				valorTotal: sale.valorTotal,
				custoTotal: sale.custoTotal,
				vendedorNome: sale.vendedorNome,
				documento: sale.documento,
				natureza: sale.natureza,
				situacao: sale.situacao,
				itens: sale.itens.map((item) => ({
					quantidade: item.quantidade,
					valorUnitario: item.valorVendaUnitario,
					valorTotal: item.valorVendaTotalLiquido,
					produto: {
						descricao: item.produto.descricao,
						codigo: item.produto.codigo,
						grupo: item.produto.grupo,
						tipo: item.produto.tipo,
					},
				})),
			})),
		};
	} catch (error) {
		console.error("[DATABASE_TOOLS] Error fetching purchase history:", error);
		return {
			success: false,
			error: "Erro ao buscar histórico de compras",
		};
	}
}

export async function getCustomerPurchaseInsights(clientId: string) {
	try {
		console.log("[INFO] [DATABASE_TOOLS] [GET_CUSTOMER_PURCHASE_INSIGHTS] Client ID:", clientId);
		// Get client with RFM data
		const client = await db.query.clients.findFirst({
			where: eq(clients.id, clientId),
		});

		if (!client) {
			return {
				success: false,
				error: "Cliente não encontrado",
			};
		}

		// Get aggregated purchase statistics
		const purchaseStats = await db
			.select({
				totalCompras: sql<number>`COUNT(DISTINCT ${sales.id})`,
				valorTotalGasto: sql<number>`COALESCE(SUM(${sales.valorTotal}), 0)`,
				ticketMedio: sql<number>`COALESCE(AVG(${sales.valorTotal}), 0)`,
			})
			.from(sales)
			.where(eq(sales.clienteId, clientId));

		// Get favorite product groups
		const favoriteGroups = await db
			.select({
				grupo: products.grupo,
				quantidadeCompras: sql<number>`COUNT(${saleItems.id})`,
				valorTotal: sql<number>`SUM(${saleItems.valorVendaTotalLiquido})`,
			})
			.from(saleItems)
			.innerJoin(products, eq(saleItems.produtoId, products.id))
			.where(eq(saleItems.clienteId, clientId))
			.groupBy(products.grupo)
			.orderBy(desc(sql`SUM(${saleItems.valorVendaTotalLiquido})`))
			.limit(5);

		// Get top purchased products
		const topProducts = await db
			.select({
				descricao: products.descricao,
				codigo: products.codigo,
				grupo: products.grupo,
				quantidadeCompras: sql<number>`SUM(${saleItems.quantidade})`,
				valorTotal: sql<number>`SUM(${saleItems.valorVendaTotalLiquido})`,
			})
			.from(saleItems)
			.innerJoin(products, eq(saleItems.produtoId, products.id))
			.where(eq(saleItems.clienteId, clientId))
			.groupBy(products.id, products.descricao, products.codigo, products.grupo)
			.orderBy(desc(sql`SUM(${saleItems.valorVendaTotalLiquido})`))
			.limit(10);

		return {
			success: true,
			data: {
				rfmAnalysis: client.analiseRFMTitulo
					? {
							titulo: client.analiseRFMTitulo,
							recencia: client.analiseRFMNotasRecencia,
							frequencia: client.analiseRFMNotasFrequencia,
							monetario: client.analiseRFMNotasMonetario,
							ultimaAtualizacao: client.analiseRFMUltimaAtualizacao,
						}
					: null,
				statistics: {
					totalCompras: Number(purchaseStats[0]?.totalCompras || 0),
					valorTotalGasto: Number(purchaseStats[0]?.valorTotalGasto || 0),
					ticketMedio: Number(purchaseStats[0]?.ticketMedio || 0),
				},
				primeiraCompra: {
					data: client.primeiraCompraData,
					id: client.primeiraCompraId,
				},
				ultimaCompra: {
					data: client.ultimaCompraData,
					id: client.ultimaCompraId,
				},
				gruposFavoritos: favoriteGroups.map((g) => ({
					grupo: g.grupo,
					quantidadeCompras: Number(g.quantidadeCompras),
					valorTotal: Number(g.valorTotal),
				})),
				produtosMaisComprados: topProducts.map((p) => ({
					descricao: p.descricao,
					codigo: p.codigo,
					grupo: p.grupo,
					quantidadeCompras: Number(p.quantidadeCompras),
					valorTotal: Number(p.valorTotal),
				})),
			},
		};
	} catch (error) {
		console.error("[DATABASE_TOOLS] Error fetching customer insights:", error);
		return {
			success: false,
			error: "Erro ao buscar insights do cliente",
		};
	}
}

export async function getCustomerRecentPurchases(clientId: string, limit = 5) {
	try {
		const recentPurchases = await db.query.sales.findMany({
			where: eq(sales.clienteId, clientId),
			orderBy: [desc(sales.dataVenda)],
			limit,
			with: {
				itens: {
					with: {
						produto: true,
					},
					limit: 10, // Limit items per sale
				},
			},
		});

		return {
			success: true,
			data: recentPurchases.map((sale) => ({
				dataVenda: sale.dataVenda,
				valorTotal: sale.valorTotal,
				vendedorNome: sale.vendedorNome,
				quantidadeItens: sale.itens.length,
				principaisItens: sale.itens.slice(0, 5).map((item) => ({
					produto: item.produto.descricao,
					quantidade: item.quantidade,
					valorTotal: item.valorVendaTotalLiquido,
				})),
			})),
		};
	} catch (error) {
		console.error("[DATABASE_TOOLS] Error fetching recent purchases:", error);
		return {
			success: false,
			error: "Erro ao buscar compras recentes",
		};
	}
}

// ============================================================================
// Product Catalog Tools
// ============================================================================

export async function searchProducts(query: string, limit = 10) {
	try {
		if (!query || query.trim().length < 2) {
			return {
				success: false,
				error: "Termo de busca muito curto",
			};
		}

		const searchResults = await db.query.products.findMany({
			where: ilike(products.descricao, `%${query}%`),
			limit,
		});

		return {
			success: true,
			data: searchResults.map((product) => ({
				descricao: product.descricao,
				codigo: product.codigo,
				grupo: product.grupo,
				tipo: product.tipo,
				unidade: product.unidade,
				ncm: product.ncm,
			})),
		};
	} catch (error) {
		console.error("[DATABASE_TOOLS] Error searching products:", error);
		return {
			success: false,
			error: "Erro ao buscar produtos",
		};
	}
}

export async function getProductsByGroup(group: string, limit = 15) {
	try {
		console.log("[INFO] [DATABASE_TOOLS] [GET_PRODUCTS_BY_GROUP] Group:", group);
		const productsByGroup = await db.query.products.findMany({
			where: eq(products.grupo, group),
			limit,
		});

		return {
			success: true,
			data: productsByGroup.map((product) => ({
				descricao: product.descricao,
				codigo: product.codigo,
				grupo: product.grupo,
				tipo: product.tipo,
				unidade: product.unidade,
			})),
		};
	} catch (error) {
		console.error("[DATABASE_TOOLS] Error fetching products by group:", error);
		return {
			success: false,
			error: "Erro ao buscar produtos por grupo",
		};
	}
}

export async function getProductByCode(code: string) {
	try {
		console.log("[INFO] [DATABASE_TOOLS] [GET_PRODUCT_BY_CODE] Code:", code);
		const product = await db.query.products.findFirst({
			where: eq(products.codigo, code),
		});

		if (!product) {
			return {
				success: false,
				error: "Produto não encontrado",
			};
		}

		return {
			success: true,
			data: {
				descricao: product.descricao,
				codigo: product.codigo,
				grupo: product.grupo,
				tipo: product.tipo,
				unidade: product.unidade,
				ncm: product.ncm,
			},
		};
	} catch (error) {
		console.error("[DATABASE_TOOLS] Error fetching product by code:", error);
		return {
			success: false,
			error: "Erro ao buscar produto",
		};
	}
}

export async function getAvailableProductGroups() {
	try {
		console.log("[INFO] [DATABASE_TOOLS] [GET_AVAILABLE_PRODUCT_GROUPS]");
		const groups = await db.selectDistinct({ grupo: products.grupo }).from(products).orderBy(products.grupo);

		return {
			success: true,
			data: groups.map((g) => g.grupo),
		};
	} catch (error) {
		console.error("[DATABASE_TOOLS] Error fetching product groups:", error);
		return {
			success: false,
			error: "Erro ao buscar grupos de produtos",
		};
	}
}
