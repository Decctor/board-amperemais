import { db, type DBTransaction } from "@/services/drizzle";
import { financialReconciliationRules } from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import type { TFinancialTransactionTypeEnum, TPaymentMethodEnum } from "@/schemas/enums";
import { normalizeStatementDescription } from "./normalize";

/**
 * Regras aprendidas de categorização (papel do supplierProductMappings em compras): quando o
 * usuário confirma "criar lançamento" a partir de uma linha, o de-para descrição → contas
 * contábeis é persistido; a próxima linha parecida já vem com as contas sugeridas.
 */

const RULE_SUGGESTION_MIN_SIMILARITY = 0.6;

export async function learnReconciliationRule({
	trx,
	organizacaoId,
	descricao,
	tipo,
	contaContabilDebitoId,
	contaContabilCreditoId,
	metodo,
}: {
	trx?: DBTransaction;
	organizacaoId: string;
	descricao: string;
	tipo: TFinancialTransactionTypeEnum;
	contaContabilDebitoId: string;
	contaContabilCreditoId: string;
	metodo?: TPaymentMethodEnum | null;
}) {
	const padraoDescricao = normalizeStatementDescription(descricao).slice(0, 500);
	if (!padraoDescricao) return;

	const executor = trx ?? db;
	await executor
		.insert(financialReconciliationRules)
		.values({ organizacaoId, padraoDescricao, tipo, contaContabilDebitoId, contaContabilCreditoId, metodo: metodo ?? null })
		.onConflictDoUpdate({
			target: [financialReconciliationRules.organizacaoId, financialReconciliationRules.padraoDescricao, financialReconciliationRules.tipo],
			set: {
				contaContabilDebitoId,
				contaContabilCreditoId,
				metodo: metodo ?? null,
				usos: sql`${financialReconciliationRules.usos} + 1`,
			},
		});
}

function ruleSimilarity(a: string, b: string) {
	const tokensA = new Set(a.split(" ").filter((token) => token.length >= 3));
	const tokensB = new Set(b.split(" ").filter((token) => token.length >= 3));
	if (tokensA.size === 0 || tokensB.size === 0) return 0;
	let intersection = 0;
	for (const token of tokensA) if (tokensB.has(token)) intersection++;
	return intersection / Math.min(tokensA.size, tokensB.size);
}

/** Melhor regra para uma linha: match exato do padrão normalizado, senão maior overlap de tokens. */
export async function suggestRuleForStatementLine({
	organizacaoId,
	descricao,
	tipo,
}: {
	organizacaoId: string;
	descricao: string;
	tipo: TFinancialTransactionTypeEnum;
}) {
	const padrao = normalizeStatementDescription(descricao);
	if (!padrao) return null;

	const exact = await db.query.financialReconciliationRules.findFirst({
		where: and(
			eq(financialReconciliationRules.organizacaoId, organizacaoId),
			eq(financialReconciliationRules.tipo, tipo),
			eq(financialReconciliationRules.padraoDescricao, padrao),
		),
	});
	if (exact) return exact;

	const rules = await db.query.financialReconciliationRules.findMany({
		where: and(eq(financialReconciliationRules.organizacaoId, organizacaoId), eq(financialReconciliationRules.tipo, tipo)),
		orderBy: (fields, { desc }) => desc(fields.usos),
		limit: 200,
	});

	let best: { rule: (typeof rules)[number]; similarity: number } | null = null;
	for (const rule of rules) {
		const similarity = ruleSimilarity(padrao, rule.padraoDescricao);
		if (similarity >= RULE_SUGGESTION_MIN_SIMILARITY && (!best || similarity > best.similarity)) best = { rule, similarity };
	}
	return best?.rule ?? null;
}
