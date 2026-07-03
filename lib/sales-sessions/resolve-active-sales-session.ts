import { db } from "@/services/drizzle";
import { salesSessions } from "@/services/drizzle/schema";
import type { TSalesSession } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";

/**
 * Único ponto que decide "qual sessão de venda?".
 *
 * A resolução parte do cliente: normalmente recebemos `sessaoVendaId` explícito e apenas validamos
 * (existe, está ABERTA, é da organização). Quando só temos o escopo (ex.: fallback no escopo
 * OPERADOR), buscamos a sessão ABERTA daquele escopo.
 *
 * Retorna a sessão ABERTA correspondente ou `null`.
 */
export async function resolveActiveSalesSession({
	orgId,
	sessaoVendaId,
	escopoChave,
}: {
	orgId: string;
	sessaoVendaId?: string | null;
	escopoChave?: string | null;
}): Promise<TSalesSession | null> {
	if (sessaoVendaId) {
		const session = await db.query.salesSessions.findFirst({
			where: and(eq(salesSessions.id, sessaoVendaId), eq(salesSessions.organizacaoId, orgId), eq(salesSessions.status, "ABERTA")),
		});
		return session ?? null;
	}

	if (escopoChave) {
		const session = await db.query.salesSessions.findFirst({
			where: and(eq(salesSessions.organizacaoId, orgId), eq(salesSessions.escopoChave, escopoChave), eq(salesSessions.status, "ABERTA")),
		});
		return session ?? null;
	}

	return null;
}
