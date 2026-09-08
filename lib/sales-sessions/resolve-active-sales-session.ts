import { db } from "@/services/drizzle";
import { salesSessions, type TSalesSession } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";

/** Validates an explicitly selected open session in the current organization. */
export async function resolveActiveSalesSession({
	orgId,
	sessaoVendaId,
}: {
	orgId: string;
	sessaoVendaId?: string | null;
}): Promise<TSalesSession | null> {
	if (!sessaoVendaId) return null;
	return (
		(await db.query.salesSessions.findFirst({
			where: and(eq(salesSessions.id, sessaoVendaId), eq(salesSessions.organizacaoId, orgId), eq(salesSessions.status, "ABERTA")),
		})) ?? null
	);
}
