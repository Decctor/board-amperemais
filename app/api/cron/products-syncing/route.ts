import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { CATALOG_SYNC_INTEGRATION_TYPES, syncProductsForIntegration } from "@/lib/data-connectors";
import { getActiveDataSourceIntegrations } from "@/lib/integrations/data-sources";
import { db } from "@/services/drizzle";
import { utils } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";

/**
 * Products Syncing Cron Job
 *
 * This cron job synchronizes the product catalog from external integrations.
 * Currently supports: CARDAPIO-WEB, NUVEM-SHOP
 *
 * Runs once daily to:
 * - Upsert products (by external identity with legacy codigo fallback)
 * - Upsert addOns (by idExterno)
 * - Upsert addOnOptions (by idExterno)
 * - Recreate product-addOn references
 */

async function getProductsSyncingRoute(_req: NextRequest) {
	console.log(`[PRODUCTS-SYNCING] Starting products sync at ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`);

	const integrationsForCatalog = await getActiveDataSourceIntegrations({
		executor: db,
		types: CATALOG_SYNC_INTEGRATION_TYPES,
	});

	let successCount = 0;
	let errorCount = 0;

	for (const integration of integrationsForCatalog) {
		console.log(
			`[ORG: ${integration.organizacaoId}] [PRODUCTS-SYNCING] Processing ${integration.tipo} catalog sync (integration ${integration.id})`,
		);
		try {
			await syncProductsForIntegration({ integration });
			successCount++;
		} catch (error) {
			errorCount++;
			console.error(`[ORG: ${integration.organizacaoId}] [PRODUCTS-SYNCING] Error:`, error);

			const identificador = integration.tipo === "NUVEM-SHOP" ? ("NUVEMSHOP_IMPORTATION" as const) : ("CARDAPIO_WEB_IMPORTATION" as const);
			const descricao =
				integration.tipo === "NUVEM-SHOP" ? "Erro ao sincronizar catálogo da Nuvemshop." : "Erro ao sincronizar catálogo do CardapioWeb.";

			await db
				.insert(utils)
				.values({
					organizacaoId: integration.organizacaoId,
					identificador,
					valor: {
						identificador,
						dados: {
							tipo: "CATALOG_SYNC_ERROR",
							organizacaoId: integration.organizacaoId,
							data: dayjs().format("YYYY-MM-DD"),
							erro: JSON.stringify(error, Object.getOwnPropertyNames(error)),
							descricao,
						},
					},
				})
				.returning({ id: utils.id });
		}
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
