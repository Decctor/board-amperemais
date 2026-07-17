import type { DBTransaction } from "@/services/drizzle";
import { financialAccounts, type TFinancialAccount } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";

/**
 * Contas financeiras "first-party": criadas e gerenciadas pelo sistema, identificadas por uma
 * chave estável em `financialAccounts.chaveSistema` (contas do usuário ficam com chave null).
 * O índice único (organizacao, chave) garante idempotência do provisionamento mesmo com
 * corrida entre webhook/cron.
 */

export const FIRST_PARTY_ACCOUNT_KEYS = {
	/** Conta de repasse do iFood (clearing): dinheiro que está com o iFood até o repasse. */
	IFOOD: "IFOOD",
} as const;
export type TFirstPartyAccountKey = (typeof FIRST_PARTY_ACCOUNT_KEYS)[keyof typeof FIRST_PARTY_ACCOUNT_KEYS];

const FIRST_PARTY_ACCOUNT_BLUEPRINTS: Record<TFirstPartyAccountKey, Pick<TFinancialAccount, "nome" | "descricao" | "tipo">> = {
	IFOOD: {
		nome: "iFood",
		descricao: "Conta de repasse do iFood (criada automaticamente pela integração). Recebíveis dos pedidos pagos online ficam aqui até o repasse.",
		tipo: "CARTEIRA_DIGITAL",
	},
};

export async function ensureFirstPartyFinancialAccount(
	tx: DBTransaction,
	{ organizationId, key }: { organizationId: string; key: TFirstPartyAccountKey },
): Promise<{ id: string }> {
	const existing = await tx.query.financialAccounts.findFirst({
		where: and(eq(financialAccounts.organizacaoId, organizationId), eq(financialAccounts.chaveSistema, key)),
		columns: { id: true },
	});
	if (existing) return existing;

	const blueprint = FIRST_PARTY_ACCOUNT_BLUEPRINTS[key];
	const inserted = await tx
		.insert(financialAccounts)
		.values({
			organizacaoId: organizationId,
			nome: blueprint.nome,
			descricao: blueprint.descricao,
			tipo: blueprint.tipo,
			chaveSistema: key,
			saldoInicial: 0,
			dataSaldoInicial: new Date(),
		})
		// Corrida entre processos (webhook + cron): o índice único resolve — quem perder relê.
		.onConflictDoNothing({ target: [financialAccounts.organizacaoId, financialAccounts.chaveSistema] })
		.returning({ id: financialAccounts.id });

	if (inserted[0]) return inserted[0];

	const raced = await tx.query.financialAccounts.findFirst({
		where: and(eq(financialAccounts.organizacaoId, organizationId), eq(financialAccounts.chaveSistema, key)),
		columns: { id: true },
	});
	if (!raced) throw new Error(`Falha ao provisionar conta financeira first-party "${key}" para a organização ${organizationId}.`);
	return raced;
}
