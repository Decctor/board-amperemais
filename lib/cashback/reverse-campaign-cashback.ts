import type { DBTransaction } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions } from "@/services/drizzle/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";

function normalizeValue(value: number) {
	return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function appendReversalMetadata(metadata: unknown, extra: Record<string, unknown>) {
	const sanitizedExtra = Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined));
	if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
		return { ...metadata, ...sanitizedExtra };
	}

	return sanitizedExtra;
}

function getInteractionIdFromMetadata(metadata: unknown): string | null {
	if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
	const interactionId = (metadata as { interacaoId?: unknown }).interacaoId;
	return typeof interactionId === "string" ? interactionId : null;
}

/**
 * Reverses campaign-generated cashback linked to interactions whose send was blocked
 * (e.g., by weekly send limits). The link is the `metadados.interacaoId` stamped on the
 * ACÚMULO transaction at generation time.
 *
 * Mirrors the accumulation-reversal pattern of `reverseSaleCashback`:
 * 1. Reverses only the remaining value, clamped to the client's available balance
 * 2. Creates a CANCELAMENTO transaction for the audit trail
 * 3. Marks the original transaction as EXPIRADO (making the reversal idempotent)
 * 4. Updates the client's balance
 */
export async function reverseCampaignCashbackForBlockedInteractions({
	tx,
	organizationId,
	interactionIds,
	reason = "ENVIO_BLOQUEADO_LIMITE_SEMANAL",
}: {
	tx: DBTransaction;
	organizationId: string;
	interactionIds: string[];
	reason?: string;
}): Promise<{ reversedTransactionsCount: number; totalReversedAmount: number }> {
	if (interactionIds.length === 0) return { reversedTransactionsCount: 0, totalReversedAmount: 0 };

	const now = new Date();

	const relatedAccumulations = await tx
		.select()
		.from(cashbackProgramTransactions)
		.where(
			and(
				eq(cashbackProgramTransactions.organizacaoId, organizationId),
				eq(cashbackProgramTransactions.tipo, "ACÚMULO"),
				or(eq(cashbackProgramTransactions.status, "ATIVO"), eq(cashbackProgramTransactions.status, "CONSUMIDO")),
				inArray(sql`${cashbackProgramTransactions.metadados} ->> 'interacaoId'`, interactionIds),
			),
		);

	if (relatedAccumulations.length === 0) return { reversedTransactionsCount: 0, totalReversedAmount: 0 };

	let reversedTransactionsCount = 0;
	let totalReversedAmount = 0;

	for (const transaction of relatedAccumulations) {
		const interactionId = getInteractionIdFromMetadata(transaction.metadados);

		let amountToReverse = transaction.valorRestante;

		if (amountToReverse <= 0) {
			await tx
				.update(cashbackProgramTransactions)
				.set({
					status: "EXPIRADO",
					valorRestante: 0,
					metadados: appendReversalMetadata(transaction.metadados, { motivoExpiracao: reason }),
					dataAtualizacao: now,
				})
				.where(eq(cashbackProgramTransactions.id, transaction.id));
			continue;
		}

		const currentBalance = await tx.query.cashbackProgramBalances.findFirst({
			where: (fields, { and, eq }) =>
				and(eq(fields.clienteId, transaction.clienteId), eq(fields.programaId, transaction.programaId), eq(fields.organizacaoId, organizationId)),
		});

		if (!currentBalance) {
			console.error(
				`[CAMPAIGN_CASHBACK_REVERSAL] Balance not found for client ${transaction.clienteId} and program ${transaction.programaId}. Skipping transaction ${transaction.id}.`,
			);
			continue;
		}

		const previousBalance = currentBalance.saldoValorDisponivel;
		amountToReverse = Math.max(0, Math.min(amountToReverse, previousBalance));
		if (amountToReverse <= 0) {
			await tx
				.update(cashbackProgramTransactions)
				.set({
					status: "EXPIRADO",
					valorRestante: 0,
					metadados: appendReversalMetadata(transaction.metadados, { motivoExpiracao: reason }),
					dataAtualizacao: now,
				})
				.where(eq(cashbackProgramTransactions.id, transaction.id));
			continue;
		}

		const newBalance = Math.max(0, normalizeValue(previousBalance - amountToReverse));
		const newAccumulatedTotal = Math.max(0, normalizeValue(currentBalance.saldoValorAcumuladoTotal - amountToReverse));

		await tx.insert(cashbackProgramTransactions).values({
			organizacaoId: organizationId,
			clienteId: transaction.clienteId,
			vendaId: transaction.vendaId,
			programaId: transaction.programaId,
			tipo: "CANCELAMENTO",
			status: "ATIVO",
			valor: -amountToReverse,
			valorRestante: 0,
			vendaValor: transaction.vendaValor,
			saldoValorAnterior: previousBalance,
			saldoValorPosterior: newBalance,
			expiracaoData: null,
			campanhaId: transaction.campanhaId,
			dataInsercao: now,
			metadados: {
				transacaoOrigemId: transaction.id,
				interacaoId: interactionId,
				motivo: reason,
			},
		});

		await tx
			.update(cashbackProgramTransactions)
			.set({
				status: "EXPIRADO",
				valorRestante: 0,
				metadados: appendReversalMetadata(transaction.metadados, { motivoExpiracao: reason }),
				dataAtualizacao: now,
			})
			.where(eq(cashbackProgramTransactions.id, transaction.id));

		await tx
			.update(cashbackProgramBalances)
			.set({
				saldoValorDisponivel: newBalance,
				saldoValorAcumuladoTotal: newAccumulatedTotal,
				dataAtualizacao: now,
			})
			.where(eq(cashbackProgramBalances.id, currentBalance.id));

		reversedTransactionsCount += 1;
		totalReversedAmount += amountToReverse;

		console.log(
			`[CAMPAIGN_CASHBACK_REVERSAL] Reversed transaction ${transaction.id} (interaction ${interactionId}) for client ${transaction.clienteId}: ${amountToReverse.toFixed(2)}. New balance: ${newBalance.toFixed(2)}.`,
		);
	}

	return { reversedTransactionsCount, totalReversedAmount };
}
