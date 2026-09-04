import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { getErrorMessage } from "@/lib/errors";
import { notifyFiscalPendingDigest } from "@/lib/fiscal/notifications";
import { getFiscalPendingSummary } from "@/lib/fiscal/pending";
import { db } from "@/services/drizzle";
import { NextRequest, NextResponse } from "next/server";

/**
 * Resumo diario de pendencias fiscais por organizacao com fiscal configurado. Roda uma vez ao dia
 * (vercel.json); quem nao tem pendencia nao recebe nada.
 */
async function sendFiscalPendingDigestRoute(_request: NextRequest) {
	const organizations = await db.query.organizations.findMany({
		where: (fields, operators) => operators.isNotNull(fields.fiscalConfiguracao),
		columns: { id: true, nome: true, fiscalConfiguracao: true, fiscalProvedor: true },
	});

	let enviados = 0;
	const falhas: Array<{ organizacaoId: string; erro: string }> = [];
	for (const organization of organizations) {
		try {
			const summary = await getFiscalPendingSummary({ organizacaoId: organization.id, provedor: organization.fiscalProvedor });
			const result = await notifyFiscalPendingDigest({ organization, summary });
			if (result.enviado) enviados += 1;
		} catch (error) {
			falhas.push({ organizacaoId: organization.id, erro: getErrorMessage(error) });
		}
	}

	return NextResponse.json({
		data: { organizacoes: organizations.length, enviados, falhas },
		message: `Resumo fiscal enviado para ${enviados} organização(ões); ${falhas.length} falha(s).`,
	});
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return sendFiscalPendingDigestRoute(req);
	},
});
