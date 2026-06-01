import { appApiHandler } from "@/lib/app-api";
import { createCardapioWebClient, getCardapioWebCatalog } from "@/lib/data-connectors/cardapio-web";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { extractAllCatalogData } from "@/lib/data-connectors/cardapio-web/catalog-mappers";
import type { TCardapioWebConfig } from "@/lib/data-connectors/cardapio-web/types";
import { db } from "@/services/drizzle";
import { productAddOnOptions, productAddOnReferences, productAddOns, products, utils } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
/**
 * Products Syncing Cron Job
 *
 * This cron job synchronizes the product catalog from external integrations.
 * Currently supports: CARDAPIO-WEB
 *
 * Runs once daily to:
 * - Upsert products (by external identity with legacy codigo fallback)
 * - Upsert addOns (by idExterno)
 * - Upsert addOnOptions (by idExterno)
 * - Recreate product-addOn references
 */

/**
 * Handler for CARDAPIO-WEB catalog sync.
 */
async function handleCardapioWebCatalogSync(organizationId: string, config: TCardapioWebConfig) {
	const client = createCardapioWebClient(config);

	console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] Fetching catalog from CardapioWeb...`);
	const catalog = await getCardapioWebCatalog(client);

	// Extract all mapped data
	const {
		products: mappedProducts,
		addOns: mappedAddOns,
		addOnOptions: mappedAddOnOptions,
		productAddOnReferences: mappedReferences,
	} = extractAllCatalogData(catalog);

	console.log(
		`[ORG: ${organizationId}] [CATALOG-SYNC] Extracted ${mappedProducts.length} products, ${mappedAddOns.length} addOns, ${mappedAddOnOptions.length} options, ${mappedReferences.length} references`,
	);

	await db.transaction(async (tx) => {
		// ---------------------------------------------------------------------
		// PRODUCTS: Upsert by external identity with legacy codigo fallback
		// ---------------------------------------------------------------------
		const productCodes = [...new Set(mappedProducts.flatMap((product) => [product.codigo, product.idExterno]))];
		const existingProducts = await tx.query.products.findMany({
			where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.codigo, productCodes)),
			columns: { id: true, codigo: true },
		});
		const existingProductsByCode = new Map(existingProducts.map((product) => [product.codigo, product.id]));
		const existingProductsMap = new Map<string, string>();

		let productsCreated = 0;
		let productsUpdated = 0;

		for (const product of mappedProducts) {
			const existingId = existingProductsByCode.get(product.codigo) ?? existingProductsByCode.get(product.idExterno);

			if (existingId) {
				// Update existing product
				await tx
					.update(products)
					.set({
						ativo: product.ativo,
						codigo: product.codigo,
						descricao: product.descricao,
						imagemCapaUrl: product.imagemCapaUrl,
						precoVenda: product.precoVenda,
						precoCusto: product.precoCusto,
						unidade: product.unidade,
						grupo: product.grupo,
						tipo: product.tipo,
						quantidade: product.quantidade,
						dataUltimaSincronizacao: new Date(),
					})
					.where(eq(products.id, existingId));
				existingProductsMap.set(product.idExterno, existingId);
				productsUpdated++;
			} else {
				// Insert new product
				const [inserted] = await tx
					.insert(products)
					.values({
						organizacaoId: organizationId,
						ativo: product.ativo,
						codigo: product.codigo,
						descricao: product.descricao,
						imagemCapaUrl: product.imagemCapaUrl,
						precoVenda: product.precoVenda,
						precoCusto: product.precoCusto,
						unidade: product.unidade,
						grupo: product.grupo,
						ncm: product.ncm,
						tipo: product.tipo,
						quantidade: product.quantidade,
						dataUltimaSincronizacao: new Date(),
					})
					.returning({ id: products.id });
				existingProductsMap.set(product.idExterno, inserted.id);
				productsCreated++;
			}
		}

		console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] Products: ${productsCreated} created, ${productsUpdated} updated`);

		// ---------------------------------------------------------------------
		// ADDONS: Upsert by idExterno
		// ---------------------------------------------------------------------
		const addOnExternalIds = mappedAddOns.map((a) => a.idExterno);
		const existingAddOns = await tx.query.productAddOns.findMany({
			where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.idExterno, addOnExternalIds)),
			columns: { id: true, idExterno: true },
		});
		const existingAddOnsMap = new Map(existingAddOns.map((a) => [a.idExterno, a.id]));

		let addOnsCreated = 0;
		let addOnsUpdated = 0;

		for (const addOn of mappedAddOns) {
			const existingId = existingAddOnsMap.get(addOn.idExterno);

			if (existingId) {
				// Update existing addOn
				await tx
					.update(productAddOns)
					.set({
						nome: addOn.nome,
						minOpcoes: addOn.minOpcoes,
						maxOpcoes: addOn.maxOpcoes ?? 1,
						ativo: addOn.ativo,
					})
					.where(eq(productAddOns.id, existingId));
				addOnsUpdated++;
			} else {
				// Insert new addOn
				const [inserted] = await tx
					.insert(productAddOns)
					.values({
						organizacaoId: organizationId,
						idExterno: addOn.idExterno,
						nome: addOn.nome,
						minOpcoes: addOn.minOpcoes,
						maxOpcoes: addOn.maxOpcoes ?? 1,
						ativo: addOn.ativo,
					})
					.returning({ id: productAddOns.id });
				existingAddOnsMap.set(addOn.idExterno, inserted.id);
				addOnsCreated++;
			}
		}

		console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] AddOns: ${addOnsCreated} created, ${addOnsUpdated} updated`);

		// ---------------------------------------------------------------------
		// ADDON OPTIONS: Upsert by idExterno
		// ---------------------------------------------------------------------
		const optionExternalIds = mappedAddOnOptions.flatMap((option) => [option.idExterno, option.idExterno.split(":").at(-1) as string]);
		const existingOptions = await tx.query.productAddOnOptions.findMany({
			where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.idExterno, optionExternalIds)),
			columns: { id: true, idExterno: true, produtoAddOnId: true },
		});
		const addOnExternalIdsById = new Map(Array.from(existingAddOnsMap.entries()).map(([externalId, id]) => [id, externalId]));
		const existingOptionsMap = new Map<string, string>();
		for (const option of existingOptions) {
			if (option.idExterno) existingOptionsMap.set(option.idExterno, option.id);
		}
		const existingLegacyOptionsMap = new Map(
			existingOptions
				.filter((option) => option.idExterno && !option.idExterno.includes(":"))
				.map((option) => [`${addOnExternalIdsById.get(option.produtoAddOnId)}:${option.idExterno}`, option.id]),
		);

		let optionsCreated = 0;
		let optionsUpdated = 0;

		for (const option of mappedAddOnOptions) {
			const addOnId = existingAddOnsMap.get(option.addOnIdExterno);
			if (!addOnId) {
				console.warn(`[ORG: ${organizationId}] [CATALOG-SYNC] AddOn not found for option ${option.idExterno}, skipping`);
				continue;
			}

			const existingId = existingOptionsMap.get(option.idExterno) ?? existingLegacyOptionsMap.get(option.idExterno);
			const productId = option.produtoIdExterno ? existingProductsMap.get(option.produtoIdExterno) : null;

			if (existingId) {
				// Update existing option
				await tx
					.update(productAddOnOptions)
					.set({
						produtoAddOnId: addOnId,
						idExterno: option.idExterno,
						nome: option.nome,
						codigo: option.codigo,
						precoDelta: option.precoDelta,
						maxQtdePorItem: option.maxQtdePorItem ?? 1,
						produtoId: productId ?? null,
						ativo: option.ativo,
					})
					.where(eq(productAddOnOptions.id, existingId));
				optionsUpdated++;
			} else {
				// Insert new option
				const [inserted] = await tx
					.insert(productAddOnOptions)
					.values({
						organizacaoId: organizationId,
						produtoAddOnId: addOnId,
						idExterno: option.idExterno,
						nome: option.nome,
						codigo: option.codigo,
						precoDelta: option.precoDelta,
						maxQtdePorItem: option.maxQtdePorItem ?? 1,
						produtoId: productId ?? null,
						ativo: option.ativo,
					})
					.returning({ id: productAddOnOptions.id });
				existingOptionsMap.set(option.idExterno, inserted.id);
				optionsCreated++;
			}
		}

		console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] AddOnOptions: ${optionsCreated} created, ${optionsUpdated} updated`);

		// ---------------------------------------------------------------------
		// PRODUCT-ADDON REFERENCES: Delete existing and recreate
		// ---------------------------------------------------------------------
		// Get all product IDs for this org
		const productIds = Array.from(existingProductsMap.values());

		if (productIds.length > 0) {
			// Delete existing references for these products
			await tx.delete(productAddOnReferences).where(inArray(productAddOnReferences.produtoId, productIds));
		}

		// Insert new references
		let referencesCreated = 0;
		for (const ref of mappedReferences) {
			const productId = existingProductsMap.get(ref.produtoIdExterno);
			const addOnId = existingAddOnsMap.get(ref.addOnIdExterno);

			if (productId && addOnId) {
				await tx.insert(productAddOnReferences).values({
					produtoId: productId,
					produtoAddOnId: addOnId,
					ordem: ref.ordem,
				});
				referencesCreated++;
			}
		}

		console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] ProductAddOnReferences: ${referencesCreated} created`);
	});

	console.log(`[ORG: ${organizationId}] [CATALOG-SYNC] Completed successfully`);
}

/**
 * Main handler for products syncing cron job.
 */
async function getProductsSyncingRoute(_req: NextRequest) {
	console.log(`[PRODUCTS-SYNCING] Starting products sync at ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`);

	const organizations = await db.query.organizations.findMany({
		columns: {
			id: true,
			integracaoTipo: true,
			integracaoConfiguracao: true,
		},
	});

	let successCount = 0;
	let errorCount = 0;

	for (const organization of organizations) {
		// Handle CARDAPIO-WEB integration
		if (organization.integracaoTipo === "CARDAPIO-WEB") {
			console.log(`[ORG: ${organization.id}] [PRODUCTS-SYNCING] Processing CardapioWeb catalog sync`);
			try {
				await handleCardapioWebCatalogSync(organization.id, organization.integracaoConfiguracao as TCardapioWebConfig);
				successCount++;
			} catch (error) {
				errorCount++;
				console.error(`[ORG: ${organization.id}] [PRODUCTS-SYNCING] Error:`, error);
				// Log error to utils table for debugging
				await db
					.insert(utils)
					.values({
						organizacaoId: organization.id,
						identificador: "CARDAPIO_WEB_IMPORTATION" as const,
						valor: {
							identificador: "CARDAPIO_WEB_IMPORTATION" as const,
							dados: {
								tipo: "CATALOG_SYNC_ERROR",
								organizacaoId: organization.id,
								data: dayjs().format("YYYY-MM-DD"),
								erro: JSON.stringify(error, Object.getOwnPropertyNames(error)),
								descricao: "Erro ao sincronizar catálogo do CardapioWeb.",
							},
						},
					})
					.returning({ id: utils.id });
			}
		}
		// Future integrations can be added here with additional else-if blocks
	}

	console.log(`[PRODUCTS-SYNCING] Completed. Success: ${successCount}, Errors: ${errorCount}`);

	return NextResponse.json(`Products syncing completed. Success: ${successCount}, Errors: ${errorCount}`, { status: 200 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return getProductsSyncingRoute(req);
	},
});
