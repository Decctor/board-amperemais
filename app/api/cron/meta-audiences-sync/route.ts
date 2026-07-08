import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { getAllAudienceDestinationIds, syncAudienceDestination } from "@/lib/integrations/meta/audiences/sync";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refresh periódico dos públicos (Custom Audiences da Meta). Reconcilia a membership atual de cada
 * destino contra o que já foi enviado, aplicando add/remove incremental. A remoção usa os hashes
 * armazenados, então propaga a saída de clientes do segmento — inclusive exclusões (LGPD).
 */
async function metaAudiencesSyncRoute(req: NextRequest) {
	assertCronAuthorized(req);
	const startedAt = Date.now();

	const destinationIds = await getAllAudienceDestinationIds();
	let synced = 0;
	let failed = 0;
	let added = 0;
	let removed = 0;

	for (const destinationId of destinationIds) {
		try {
			const result = await syncAudienceDestination({ destinationId });
			synced += 1;
			added += result.added;
			removed += result.removed;
		} catch (error) {
			failed += 1;
			console.error("[ERROR] [META_AUDIENCES_CRON] Falha ao sincronizar destino:", {
				destinationId,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	const summary = { destinos: destinationIds.length, synced, failed, added, removed, durationMs: Date.now() - startedAt };
	console.log("[INFO] [META_AUDIENCES_CRON] Refresh concluído:", summary);
	return NextResponse.json({ data: summary, message: "Refresh de públicos do Meta concluído." });
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({ GET: metaAudiencesSyncRoute });
