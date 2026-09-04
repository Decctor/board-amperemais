import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { listFiscalIbptUfsInUse, refreshIbptRates, type TIbptRefreshFailure } from "@/lib/fiscal/ibpt-rates";
import { notifyFiscalIbptRefreshFailure } from "@/lib/fiscal/notifications";
import { getErrorMessage } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

async function refreshIbptRatesRoute(_request: NextRequest) {
	try {
		const ufs = await listFiscalIbptUfsInUse();
		const results = await refreshIbptRates({ ufs });
		const failures = results.filter((result): result is TIbptRefreshFailure => result.status === "FALHA");

		if (failures.length > 0) await notifyFiscalIbptRefreshFailure(failures);

		const updated = results.filter((result) => result.status === "ATUALIZADA").length;
		const unchanged = results.filter((result) => result.status === "SEM_ALTERACAO").length;
		console.log("[IBPT_CRON] Atualização concluída.", {
			ufs,
			updated,
			unchanged,
			failures: failures.map((failure) => ({ uf: failure.uf, erro: failure.erro })),
		});

		return NextResponse.json(
			{
				data: { ufs, atualizadas: updated, semAlteracao: unchanged, falhas: failures.length, resultados: results },
				message:
					failures.length > 0
						? `Atualização IBPT concluída com falha em ${failures.length} UF(s).`
						: `Atualização IBPT concluída para ${ufs.length} UF(s).`,
			},
			{ status: failures.length > 0 ? 500 : 200 },
		);
	} catch (error) {
		await notifyFiscalIbptRefreshFailure([{ uf: null, status: "FALHA", tentativas: 1, erro: getErrorMessage(error) }]);
		throw error;
	}
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({
	GET: async (request) => {
		assertCronAuthorized(request);
		return refreshIbptRatesRoute(request);
	},
});
