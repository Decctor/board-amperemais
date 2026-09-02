import { db } from "@/services/drizzle";
import { salesSessions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

/**
 * Confere (revisa) uma sessão FECHADA: registra quem avalizou a conferência e move o status para
 * CONFERIDA. Não recalcula nada — o snapshot de esperado/informado/diferença foi congelado no
 * fechamento e é exatamente o que o gestor está aprovando.
 */
export async function reviewSalesSession({
	orgId,
	sessaoVendaId,
	conferidaPorUsuarioId,
}: {
	orgId: string;
	sessaoVendaId: string;
	conferidaPorUsuarioId: string;
}) {
	const session = await db.query.salesSessions.findFirst({
		where: and(eq(salesSessions.id, sessaoVendaId), eq(salesSessions.organizacaoId, orgId)),
		columns: { id: true, status: true },
	});
	if (!session) throw new createHttpError.NotFound("Sessao de venda nao encontrada.");
	if (session.status !== "FECHADA") throw new createHttpError.BadRequest("Somente sessoes fechadas podem ser conferidas.");

	await db
		.update(salesSessions)
		.set({ status: "CONFERIDA", conferidaPorUsuarioId })
		.where(and(eq(salesSessions.id, sessaoVendaId), eq(salesSessions.organizacaoId, orgId)));

	return { sessaoVendaId, status: "CONFERIDA" as const, conferidaPorUsuarioId };
}
