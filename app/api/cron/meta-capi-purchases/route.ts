import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { getAllCapiPurchaseTargets } from "@/lib/integrations/meta/capi/config";
import { processCapiPurchaseTarget } from "@/lib/integrations/meta/capi/sweep";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Varredura de conversões (Purchase) para o Conversions API da Meta.
 *
 * Server-side a partir de vendas: cobre uniformemente TODOS os caminhos de criação (venda
 * interativa, PDV, loja digital, ponto de interação e importação de ERP via data-collecting) sem
 * tocar nesses sites — o gatilho é a existência de vendas recentes com `capiMetadados` pendente.
 * Idempotente por venda (event_id = id da venda) e limitado à janela de 7 dias da Meta.
 */
async function metaCapiPurchasesRoute(req: NextRequest) {
	assertCronAuthorized(req);
	const startedAt = Date.now();

	const targets = await getAllCapiPurchaseTargets();
	let processed = 0;
	let sent = 0;
	let failed = 0;
	let failedTargets = 0;

	for (const target of targets) {
		try {
			const summary = await processCapiPurchaseTarget(target);
			processed += summary.processed;
			sent += summary.sent;
			failed += summary.failed;
		} catch (error) {
			failedTargets += 1;
			console.error("[ERROR] [META_CAPI_CRON] Falha ao processar alvo:", {
				organizacaoId: target.organizacaoId,
				integrationId: target.integrationId,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	const summary = { targets: targets.length, failedTargets, processed, sent, failed, durationMs: Date.now() - startedAt };
	console.log("[INFO] [META_CAPI_CRON] Varredura concluída:", summary);
	return NextResponse.json({ data: summary, message: "Varredura de conversões do Meta concluída." });
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({ GET: metaCapiPurchasesRoute });
