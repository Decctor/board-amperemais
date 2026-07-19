import { FinancialOpenFinanceProviderEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { financialAccounts, financialOpenFinanceConnections } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

export * from "./providers";
export * from "./sync";

/**
 * Gestão de conexões OpenFinance (padrão lib/integrations: gestão aqui, ingestão em sync.ts).
 */

export async function createOpenFinanceConnection({
	organizacaoId,
	autorId,
	contaFinanceiraId,
	provedor,
	provedorItemId,
	provedorContaId,
}: {
	organizacaoId: string;
	autorId: string;
	contaFinanceiraId: string;
	provedor: string;
	provedorItemId?: string | null;
	provedorContaId?: string | null;
}) {
	const providerKey = FinancialOpenFinanceProviderEnum.safeParse(provedor);
	if (!providerKey.success) throw new createHttpError.BadRequest(`Provedor OpenFinance não suportado: ${provedor}.`);

	const account = await db.query.financialAccounts.findFirst({
		where: and(eq(financialAccounts.id, contaFinanceiraId), eq(financialAccounts.organizacaoId, organizacaoId)),
		columns: { id: true },
	});
	if (!account) throw new createHttpError.NotFound("Conta financeira não encontrada para esta organização.");

	// Idempotência pelo índice único (organizacao, provedor, provedorContaId).
	const [connection] = await db
		.insert(financialOpenFinanceConnections)
		.values({
			organizacaoId,
			contaFinanceiraId,
			provedor: providerKey.data,
			provedorItemId: provedorItemId ?? null,
			provedorContaId: provedorContaId ?? null,
			autorId,
		})
		.onConflictDoUpdate({
			target: [financialOpenFinanceConnections.organizacaoId, financialOpenFinanceConnections.provedor, financialOpenFinanceConnections.provedorContaId],
			set: { contaFinanceiraId, provedorItemId: provedorItemId ?? null, ativo: true, status: "CONECTADO", erro: null },
		})
		.returning({ id: financialOpenFinanceConnections.id });

	return { conexaoId: connection.id };
}

export async function setOpenFinanceConnectionActive({
	organizacaoId,
	conexaoId,
	ativo,
}: {
	organizacaoId: string;
	conexaoId: string;
	ativo: boolean;
}) {
	const [updated] = await db
		.update(financialOpenFinanceConnections)
		.set({ ativo, status: ativo ? "CONECTADO" : "DESATIVADO" })
		.where(and(eq(financialOpenFinanceConnections.id, conexaoId), eq(financialOpenFinanceConnections.organizacaoId, organizacaoId)))
		.returning({ id: financialOpenFinanceConnections.id });
	if (!updated) throw new createHttpError.NotFound("Conexão OpenFinance não encontrada.");
	return { conexaoId: updated.id, ativo };
}
