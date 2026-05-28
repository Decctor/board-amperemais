import { accumulateCashbackForClient } from "@/lib/cashback/accumulation";
import { applyCashbackRedemptionFIFO } from "@/lib/cashback/redemption";
import { getErrorMessage } from "@/lib/errors";
import { emitFiscalDocument } from "@/lib/fiscal/documents";
import { notifyFiscalEmissionFailure } from "@/lib/fiscal/notifications";
import { type TPaymentSplit, getPaymentProvider } from "@/lib/payments";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions, cashbackPrograms, sales } from "@/services/drizzle/schema";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { createAccountingEntry } from "./create-accounting-entry";
import { processStockDeduction } from "./process-stock-deduction";

type ProcessSaleConfirmationInput = {
	organization: TOrganizationEntity;

	saleId: string;
	salePayments: TPaymentSplit[];
	saleAuthorId: string;
	saleClientId?: string | null;

	saleCashbackProgramId?: string | null;
	saleCashbackRedemptionValue?: number;

	accountingEntryDebitAccountId: string;
	accountingEntryCreditAccountId: string;
};

type FiscalEmissionResult =
	| {
			status: "NAO_SOLICITADO";
			documentoId: null;
			error: null;
	  }
	| {
			status: "SOLICITADO";
			documentoId: string;
			statusInterno: string;
			error: null;
	  }
	| {
			status: "ERRO";
			documentoId: null;
			error: string;
	  };

export async function processSaleConfirmation(input: ProcessSaleConfirmationInput) {
	const sale = await db.query.sales.findFirst({
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

	if (sale.status !== "ORCAMENTO") {
		throw new createHttpError.BadRequest(`Venda nao pode ser confirmada no status atual: ${sale.status}`);
	}

	const transactionResult = await db.transaction(async (tx) => {
		await tx
			.update(sales)
			.set({
				status: "CONFIRMADA",
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

		if (input.organization.configuracao.preferencias.rastreamentoEstoque) {
			await processStockDeduction(tx, {
				organizationId: input.organization.id,
				saleId: input.saleId,
				saleItems: sale.itens,
				saleAuthorId: input.saleAuthorId,
			});
		}

		return { entry };
	});

	const paymentProvider = getPaymentProvider(input.organization);
	const paymentResults = await paymentProvider.processPayments({
		vendaId: input.saleId,
		lancamentoContabilId: transactionResult.entry.id,
		organizacaoId: input.organization.id,
		pagamentos: input.salePayments,
		autorId: input.saleAuthorId,
	});

	let cashbackRedemptionResult: {
		transactionId: string;
		newBalance: number;
	} | null = null;

	const clientId = input.saleClientId ?? sale.clienteId;
	const redemptionValue = input.saleCashbackRedemptionValue ?? 0;

	if (redemptionValue > 0) {
		if (!clientId) throw new createHttpError.BadRequest("Cliente nao informado para resgate de cashback.");

		cashbackRedemptionResult = await db.transaction(async (tx) => {
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
				const maxAllowed = program.resgateLimiteTipo === "FIXO" ? program.resgateLimiteValor : (sale.valorTotal * program.resgateLimiteValor) / 100;
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
		});
	}

	let cashbackAccumulationResult: Awaited<ReturnType<typeof accumulateCashbackForClient>> | null = null;

	if (clientId) {
		cashbackAccumulationResult = await db.transaction(async (tx) => {
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
		});
	}

	let fiscalResult: FiscalEmissionResult = {
		status: "NAO_SOLICITADO",
		documentoId: null,
		error: null,
	};

	if (input.organization.fiscalEmissaoAutomatica) {
		try {
			const emitted = await emitFiscalDocument({
				vendaId: input.saleId,
				tipo: "NFCE",
				organizacaoId: input.organization.id,
				lancamentoContabilId: transactionResult.entry.id,
				autorId: input.saleAuthorId,
				origem: "AUTOMATICA",
			});
			fiscalResult = {
				status: "SOLICITADO",
				documentoId: emitted.documentoId,
				statusInterno: emitted.statusInterno,
				error: null,
			};
		} catch (error) {
			const errorMessage = getErrorMessage(error);
			fiscalResult = {
				status: "ERRO",
				documentoId: null,
				error: errorMessage,
			};
			await notifyFiscalEmissionFailure({
				organization: input.organization,
				sale,
				errorMessage,
			});
		}
	}

	return {
		vendaId: input.saleId,
		lancamentoContabilId: transactionResult.entry.id,
		pagamentos: paymentResults,
		cashbackResgate: cashbackRedemptionResult,
		cashbackAcumulo: cashbackAccumulationResult,
		fiscal: fiscalResult,
	};
}
