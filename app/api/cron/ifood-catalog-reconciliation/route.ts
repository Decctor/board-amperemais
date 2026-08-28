import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { reconcileMerchantCatalog } from "@/lib/integrations/ifood/sync/reconcile";
import { db } from "@/services/drizzle";
import { catalogLinks } from "@/services/drizzle/schema";
import { ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export const maxDuration = 300;

/**
 * Reconciliação diária dos catálogos vinculados.
 *
 * Só percorre pares (organização, loja) que TÊM vínculos ativos — sem vínculo não há nada a
 * comparar, e varrer todas as organizações com iFood conectado gastaria rate limit à toa. As
 * lojas são processadas em série pelo mesmo motivo.
 */
async function reconcileAllCatalogs() {
	const pares = await db
		.selectDistinct({ organizacaoId: catalogLinks.organizacaoId, merchantId: catalogLinks.merchantId })
		.from(catalogLinks)
		.where(ne(catalogLinks.status, "DESVINCULADO"));

	const resultados: { organizacaoId: string; merchantId: string; verificados?: number; divergentes?: number; ausentes?: number; erro?: string }[] = [];
	for (const par of pares) {
		try {
			const resultado = await reconcileMerchantCatalog({ orgId: par.organizacaoId, merchantId: par.merchantId });
			resultados.push({ ...par, ...resultado });
		} catch (error) {
			// Uma loja com token expirado não pode interromper a varredura das demais.
			const message = error instanceof Error ? error.message : "Falha desconhecida na reconciliação.";
			console.error("[IFOOD_RECONCILE] Falha ao reconciliar loja.", { ...par, error });
			resultados.push({ ...par, erro: message });
		}
	}

	return {
		data: {
			lojas: resultados.length,
			divergentes: resultados.reduce((sum, item) => sum + (item.divergentes ?? 0), 0),
			erros: resultados.filter((item) => item.erro).length,
			resultados,
		},
		message: "Reconciliação de catálogos concluída.",
	};
}
export type TIfoodCatalogReconciliationOutput = Awaited<ReturnType<typeof reconcileAllCatalogs>>;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		const result = await reconcileAllCatalogs();
		return NextResponse.json(result);
	},
});
