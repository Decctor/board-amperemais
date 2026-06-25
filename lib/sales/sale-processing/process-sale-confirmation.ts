import { accumulateCashbackForClient } from "@/lib/cashback/accumulation";
import { applyCashbackRedemptionFIFO } from "@/lib/cashback/redemption";
import { type TPaymentSplit, getPaymentProvider } from "@/lib/payments";
import { db, type DBTransaction } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions, cashbackPrograms, sales } from "@/services/drizzle/schema";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { resolveInitialAttendanceStatus } from "./attendance";
import { createAccountingEntry } from "./create-accounting-entry";
import { processSaleAutomaticFiscalEmissionIfEligible } from "./process-sale-automatic-fiscal-emission";
import { processStockDeduction } from "./process-stock-deduction";

export type TProcessSaleConfirmationInput = {
	organization: TOrganizationEntity;

	saleId: string;
	salePayments: TPaymentSplit[];
	saleAuthorId: string | null;
	saleClientId?: string | null;

	saleCashbackProgramId?: string | null;
	saleCashbackRedemptionValue?: number;

	accountingEntryDebitAccountId: string;
	accountingEntryCreditAccountId: string;
	initialAttendanceStatus?: ReturnType<typeof resolveInitialAttendanceStatus>;
	accumulateCashback?: boolean;
	emitFiscal?: boolean;
};

type TProcessSaleConfirmationPostCommitInput = Pick<TProcessSaleConfirmationInput, "organization" | "saleId" | "saleAuthorId" | "emitFiscal">;

/**
 * Confirms a sale using the caller-owned transaction.
 * All database effects must use `tx`; external effects run after commit.
 */
export async function processSaleConfirmationInTransaction({ tx, input }: { tx: DBTransaction; input: TProcessSaleConfirmationInput }) {
	const sale = await tx.query.sales.findFirst({
		where: (fields, { eq }) => eq(fields.id, input.saleId),
		with: {
			itens: {
				with: {
					adicionais: true,
				},
			},
		},
	});

	if (!sale) {
		throw new createHttpError.NotFound("Venda nao encontrada.");
	}

	if (sale.statusVenda !== "ORCAMENTO") {
		throw new createHttpError.BadRequest(`Venda nao pode ser confirmada no status atual: ${sale.statusVenda}`);
	}

	// Status operacional inicial conforme a modalidade de entrega.
	const initialAttendanceStatus = input.initialAttendanceStatus ?? resolveInitialAttendanceStatus(sale.entregaModalidade);

	await tx
		.update(sales)
		.set({
			statusVenda: "CONFIRMADA",
			statusAtendimento: initialAttendanceStatus,
			natureza: "SN01",
			dataVenda: new Date(),
		})
		.where(eq(sales.id, input.saleId));

	const entry = await createAccountingEntry(tx, {
		organizacaoId: input.organization.id,
		vendaId: input.saleId,
		valor: sale.valorTotal,
		titulo: `VENDA #${sale.id}`,
		idContaDebito: input.accountingEntryDebitAccountId,
		idContaCredito: input.accountingEntryCreditAccountId,
		autorId: input.saleAuthorId,
	});

	// A confirmacao NAO baixa estoque obrigatoriamente. A baixa fisica acontece na entrega.
	// Quando a venda ja nasce ENTREGUE (ex.: balcao/PRESENCIAL), a entrega e imediata: baixa aqui.
	if (initialAttendanceStatus === "ENTREGUE" && input.organization.configuracao.preferencias.rastreamentoEstoque) {
		await processStockDeduction(tx, {
			organizationId: input.organization.id,
			saleId: input.saleId,
			saleItems: sale.itens,
			saleAuthorId: input.saleAuthorId,
		});
	}

	const paymentProvider = getPaymentProvider(input.organization);
	const paymentResults = await paymentProvider.processPayments(
		{
			vendaId: input.saleId,
			lancamentoContabilId: entry.id,
			organizacaoId: input.organization.id,
			pagamentos: input.salePayments,
			autorId: input.saleAuthorId,
		},
		tx,
	);

	let cashbackRedemptionResult: {
		transactionId: string;
		newBalance: number;
	} | null = null;

	const clientId = input.saleClientId ?? sale.clienteId;
	const redemptionValue = input.saleCashbackRedemptionValue ?? 0;

	if (redemptionValue > 0) {
		if (!clientId) throw new createHttpError.BadRequest("Cliente nao informado para resgate de cashback.");

		cashbackRedemptionResult = await (async () => {
			const existingRedemption = await tx.query.cashbackProgramTransactions.findFirst({
				where: and(
					eq(cashbackProgramTransactions.organizacaoId, input.organization.id),
					eq(cashbackProgramTransactions.vendaId, input.saleId),
					eq(cashbackProgramTransactions.tipo, "RESGATE"),
				),
				columns: { id: true, saldoValorPosterior: true },
			});
			if (existingRedemption) {
				return {
					transactionId: existingRedemption.id,
					newBalance: existingRedemption.saldoValorPosterior,
				};
			}

			const balance = await tx.query.cashbackProgramBalances.findFirst({
				where: and(eq(cashbackProgramBalances.organizacaoId, input.organization.id), eq(cashbackProgramBalances.clienteId, clientId)),
				columns: {
					programaId: true,
				},
			});
			if (!balance) throw new createHttpError.NotFound("Saldo de cashback nao encontrado para este cliente.");

			const programId = input.saleCashbackProgramId ?? balance.programaId;
			if (!programId) throw new createHttpError.BadRequest("Programa de cashback nao informado.");

			const program = await tx.query.cashbackPrograms.findFirst({
				where: and(eq(cashbackPrograms.id, programId), eq(cashbackPrograms.organizacaoId, input.organization.id), eq(cashbackPrograms.ativo, true)),
			});
			if (!program) throw new createHttpError.NotFound("Programa de cashback nao encontrado.");
			if (!program.modalidadeDescontosPermitida) throw new createHttpError.BadRequest("Resgate de cashback nao permitido para esta venda.");
			if (program.resgateLimiteTipo && program.resgateLimiteValor !== null && program.resgateLimiteValor !== undefined) {
				const saleValueBeforeCashback = sale.valorTotal + redemptionValue;
				const maxAllowed =
					program.resgateLimiteTipo === "FIXO" ? program.resgateLimiteValor : (saleValueBeforeCashback * program.resgateLimiteValor) / 100;
				if (redemptionValue > maxAllowed) throw new createHttpError.BadRequest("Valor de resgate excede o limite permitido.");
			}

			const redemptionResult = await applyCashbackRedemptionFIFO({
				tx,
				orgId: input.organization.id,
				clientId,
				programId,
				redemptionValue,
			});

			const insertedTransaction = await tx
				.insert(cashbackProgramTransactions)
				.values({
					organizacaoId: input.organization.id,
					clienteId: clientId,
					vendaId: input.saleId,
					vendaValor: sale.valorTotal,
					programaId: programId,
					status: "ATIVO",
					tipo: "RESGATE",
					valor: -redemptionValue,
					valorRestante: 0,
					saldoValorAnterior: redemptionResult.previousBalance,
					saldoValorPosterior: redemptionResult.newBalance,
					expiracaoData: null,
					operadorId: input.saleAuthorId,
					operadorVendedorId: sale.vendedorId,
					metadados: {
						consumoFifo: redemptionResult.consumedFromAccumulations,
					},
				})
				.returning({ id: cashbackProgramTransactions.id });

			const transactionId = insertedTransaction[0]?.id;
			if (!transactionId) throw new createHttpError.InternalServerError("Erro ao registrar transacao de resgate de cashback.");

			return {
				transactionId,
				newBalance: redemptionResult.newBalance,
			};
		})();
	}

	let cashbackAccumulationResult: Awaited<ReturnType<typeof accumulateCashbackForClient>> | null = null;

	if (clientId && input.accumulateCashback !== false) {
		cashbackAccumulationResult = await (async () => {
			const program = input.saleCashbackProgramId
				? await tx.query.cashbackPrograms.findFirst({
						where: and(
							eq(cashbackPrograms.id, input.saleCashbackProgramId),
							eq(cashbackPrograms.organizacaoId, input.organization.id),
							eq(cashbackPrograms.ativo, true),
						),
					})
				: await tx.query.cashbackPrograms.findFirst({
						where: and(eq(cashbackPrograms.organizacaoId, input.organization.id), eq(cashbackPrograms.ativo, true)),
					});

			if (!program) return null;

			return accumulateCashbackForClient({
				tx,
				orgId: input.organization.id,
				clientId,
				saleId: input.saleId,
				saleValue: sale.valorTotal,
				operatorId: input.saleAuthorId,
				operatorSellerId: sale.vendedorId,
				program,
				metadata: {
					origem: "POS",
					processamentoOrigem: sale.processamentoOrigem,
				},
			});
		})();
	}

	return {
		vendaId: input.saleId,
		lancamentoContabilId: entry.id,
		pagamentos: paymentResults,
		cashbackResgate: cashbackRedemptionResult,
		cashbackAcumulo: cashbackAccumulationResult,
	};
}
export async function processSaleConfirmationPostCommit(input: TProcessSaleConfirmationPostCommitInput) {
	if (input.emitFiscal === false) {
		return { status: "NAO_SOLICITADO" as const, reason: "DESATIVADO_PELO_FLUXO" as const };
	}

	return processSaleAutomaticFiscalEmissionIfEligible({
		organization: input.organization,
		saleId: input.saleId,
		authorId: input.saleAuthorId,
	});
}

export async function processSaleConfirmation(input: TProcessSaleConfirmationInput) {
	const confirmation = await db.transaction((tx) => processSaleConfirmationInTransaction({ tx, input }));
	const fiscal = await processSaleConfirmationPostCommit(input);

	return {
		...confirmation,
		fiscal,
	};
}
