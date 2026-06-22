import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { syncProductsForOrganization } from "@/lib/data-connectors";
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

	const organizations = await db.query.organizations.findMany({
		where: (fields, { inArray }) => inArray(fields.integracaoTipo, ["CARDAPIO-WEB", "NUVEM-SHOP"]),
		columns: {
			id: true,
			integracaoTipo: true,
		},
	});

	let successCount = 0;
	let errorCount = 0;

	for (const organization of organizations) {
		console.log(`[ORG: ${organization.id}] [PRODUCTS-SYNCING] Processing ${organization.integracaoTipo} catalog sync`);
		try {
			await syncProductsForOrganization({ organizationId: organization.id });
			successCount++;
		} catch (error) {
			errorCount++;
			console.error(`[ORG: ${organization.id}] [PRODUCTS-SYNCING] Error:`, error);

			const identificador = organization.integracaoTipo === "NUVEM-SHOP" ? ("NUVEMSHOP_IMPORTATION" as const) : ("CARDAPIO_WEB_IMPORTATION" as const);
			const descricao =
				organization.integracaoTipo === "NUVEM-SHOP"
					? "Erro ao sincronizar catálogo da Nuvemshop."
					: "Erro ao sincronizar catálogo do CardapioWeb.";

			await db
				.insert(utils)
				.values({
					organizacaoId: organization.id,
					identificador,
					valor: {
						identificador,
						dados: {
							tipo: "CATALOG_SYNC_ERROR",
							organizacaoId: organization.id,
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
