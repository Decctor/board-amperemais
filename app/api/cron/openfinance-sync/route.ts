import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { syncOpenFinanceConnection } from "@/lib/integrations/openfinance";
import { db } from "@/services/drizzle";
import { financialOpenFinanceConnections } from "@/services/drizzle/schema";
import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Sincroniza conexões OpenFinance ativas, priorizando as há mais tempo sem sync.
// OBS: ainda NÃO registrado em vercel.json — só existe o provider MOCK; registrar o cron
// (ex.: a cada 30min) quando um agregador real (Pluggy/Belvo) for contratado.
const MAX_CONNECTIONS_PER_RUN = 20;

async function syncOpenFinanceConnectionsRoute(_req: NextRequest) {
	const connections = await db.query.financialOpenFinanceConnections.findMany({
		where: and(eq(financialOpenFinanceConnections.ativo, true), ne(financialOpenFinanceConnections.status, "DESATIVADO")),
		columns: { id: true, organizacaoId: true },
		orderBy: (fields, { asc, sql }) => [sql`${fields.ultimaSincronizacao} asc nulls first`, asc(fields.dataInsercao)],
		limit: MAX_CONNECTIONS_PER_RUN,
	});

	let sincronizadas = 0;
	let falhas = 0;
	let importadas = 0;
	for (const connection of connections) {
		try {
			const result = await syncOpenFinanceConnection({ organizacaoId: connection.organizacaoId, conexaoId: connection.id });
			sincronizadas++;
			importadas += result.importadas;
		} catch (error) {
			// syncOpenFinanceConnection já registrou status/erro na conexão.
			falhas++;
			console.error(`[OPENFINANCE_SYNC] Falha na conexão ${connection.id}.`, error);
		}
	}

	return NextResponse.json(
		{
			data: { sincronizadas, falhas, importadas },
			message: `Sync OpenFinance: ${sincronizadas} conexão(ões) sincronizada(s), ${importadas} transação(ões) importada(s), ${falhas} falha(s).`,
		},
		{ status: 200 },
	);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return syncOpenFinanceConnectionsRoute(req);
	},
});
