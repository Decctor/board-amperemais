import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { fetchAllNuvemshopProducts, mapNuvemshopCatalogProducts } from "./index";
import type { TNuvemshopConfig } from "./types";

export async function syncNuvemshopCatalog(organizationId: string, config: TNuvemshopConfig) {
	console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] Fetching catalog from Nuvemshop...`);
	const catalogProducts = await fetchAllNuvemshopProducts(config);
	console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] Nuvemshop catalog fetched successfully`);

	const mappedProducts = mapNuvemshopCatalogProducts(catalogProducts);
	console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] Extracted ${mappedProducts.length} Nuvemshop products`);

	if (mappedProducts.length === 0) {
		console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] No Nuvemshop products to sync`);
		return;
	}

	await db.transaction(async (tx) => {
		const productCodes = [...new Set(mappedProducts.flatMap((product) => [product.codigo, product.idExterno]))];
		const existingProducts = await tx.query.products.findMany({
			where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.codigo, productCodes)),
			columns: { id: true, codigo: true },
		});
		const existingProductsByCode = new Map(existingProducts.map((product) => [product.codigo, product.id]));

		let productsCreated = 0;
		let productsUpdated = 0;

		for (const product of mappedProducts) {
			const existingId = existingProductsByCode.get(product.codigo) ?? existingProductsByCode.get(product.idExterno);

			if (existingId) {
				await tx
					.update(products)
					.set({
						ativo: product.ativo,
						codigo: product.codigo,
						nome: product.nome,
						descricao: product.descricao,
						imagemCapaUrl: product.imagemCapaUrl,
						precoVenda: product.precoVenda,
						precoCusto: product.precoCusto,
						unidade: product.unidade,
						grupo: product.grupo,
						ncm: product.ncm,
						tipo: product.tipo,
						quantidade: product.quantidade,
						rastreamentoEstoqueAtivo: product.controlaEstoque,
						dataUltimaSincronizacao: new Date(),
					})
					.where(eq(products.id, existingId));
				productsUpdated++;
			} else {
				await tx
					.insert(products)
					.values({
						organizacaoId: organizationId,
						ativo: product.ativo,
						codigo: product.codigo,
						nome: product.nome,
						descricao: product.descricao,
						imagemCapaUrl: product.imagemCapaUrl,
						precoVenda: product.precoVenda,
						precoCusto: product.precoCusto,
						unidade: product.unidade,
						grupo: product.grupo,
						ncm: product.ncm,
						tipo: product.tipo,
						quantidade: product.quantidade,
						rastreamentoEstoqueAtivo: product.controlaEstoque,
						dataUltimaSincronizacao: new Date(),
					});
				productsCreated++;
			}
		}

		console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] Nuvemshop products: ${productsCreated} created, ${productsUpdated} updated`);
	});

	console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] Nuvemshop sync completed successfully`);
}
