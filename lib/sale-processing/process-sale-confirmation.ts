import { applyCashbackRedemptionFIFO } from "@/lib/cashback/redemption";
import { getFiscalProvider } from "@/lib/fiscal";
import { type TPaymentSplit, getPaymentProvider } from "@/lib/payments";
import { db } from "@/services/drizzle";
import {
  cashbackProgramBalances,
  cashbackProgramTransactions,
  sales,
} from "@/services/drizzle/schema";
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

  // Accounting entry target accounts (must be configured per organization)
  accountingEntryDebitAccountId: string;
  accountingEntryCreditAccountId: string;
};

/**
 * Orchestrator for confirming a sale (ORCAMENTO → CONFIRMADA).
 *
 * Steps (transactional):
 * 1. Update sale status to CONFIRMADA
 * 2. Create accounting entry
 * 3. Deduct stock
 *
 * Steps (post-transaction):
 * 4. Process payments via provider → creates financial transactions
 * 5. Apply cashback redemption (when requested)
 * 6. Fiscal emission if org has automatic emission enabled
 */
export async function processSaleConfirmation(input: ProcessSaleConfirmationInput) {
  // Load the sale with its items
  const sale = await db.query.sales.findFirst({
    where: (fields, { eq }) => eq(fields.id, input.saleId),
    with: {
      itens: true,
    },
  });

  if (!sale) {
    throw new createHttpError.NotFound("Venda não encontrada.");
  }

  if (sale.status !== "ORCAMENTO") {
    throw new createHttpError.BadRequest(
      `Venda não pode ser confirmada no status atual: ${sale.status}`,
    );
  }

  // Transactional processing
  const transactionResult = await db.transaction(async (tx) => {
    // 1. Update sale status: ORCAMENTO → CONFIRMADA
    await tx
      .update(sales)
      .set({
        status: "CONFIRMADA",
        natureza: "SN01",
        dataVenda: new Date(),
      })
      .where(eq(sales.id, input.saleId));

    // 2. Create accounting entry
    const entry = await createAccountingEntry(tx, {
      organizacaoId: input.organization.id,
      vendaId: input.saleId,
      valor: sale.valorTotal,
      titulo: `VENDA #${sale.id}`,
      idContaDebito: input.accountingEntryDebitAccountId,
      idContaCredito: input.accountingEntryCreditAccountId,
      autorId: input.saleAuthorId,
    });

    // 3. Process stock deduction if organization has stock tracking enabled
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

  // 4. Process payments via provider (outside tx because providers may make external calls)
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

  if ((input.saleCashbackRedemptionValue ?? 0) > 0) {
    const redemptionValue = input.saleCashbackRedemptionValue ?? 0;
    const clientId = input.saleClientId ?? sale.clienteId;
    if (!clientId)
      throw new createHttpError.BadRequest("Cliente não informado para resgate de cashback.");

    cashbackRedemptionResult = await db.transaction(async (tx) => {
      const balance = await tx.query.cashbackProgramBalances.findFirst({
        where: and(
          eq(cashbackProgramBalances.organizacaoId, input.organization.id),
          eq(cashbackProgramBalances.clienteId, clientId),
        ),
        columns: {
          programaId: true,
        },
      });
      if (!balance)
        throw new createHttpError.NotFound("Saldo de cashback não encontrado para este cliente.");

      const programId = input.saleCashbackProgramId ?? balance.programaId;
      if (!programId) throw new createHttpError.BadRequest("Programa de cashback não informado.");

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
      if (!transactionId)
        throw new createHttpError.InternalServerError(
          "Erro ao registrar transação de resgate de cashback.",
        );

      return {
        transactionId,
        newBalance: redemptionResult.newBalance,
      };
    });
  }

  // 5. Fiscal emission (async, non-blocking)
  if (input.organization.fiscalEmissaoAutomatica) {
    try {
      const fiscalProvider = getFiscalProvider(input.organization);
      await fiscalProvider.emitirDocumento({
        venda: sale,
        tipo: "NFCE",
        organizacao: input.organization,
        lancamentoContabilId: transactionResult.entry.id,
      });
    } catch (error) {
      // Fiscal emission failure should not block sale confirmation
      console.error("[FISCAL] Erro na emissão automática:", error);
    }
  }

  return {
    vendaId: input.saleId,
    lancamentoContabilId: transactionResult.entry.id,
    pagamentos: paymentResults,
    cashbackResgate: cashbackRedemptionResult,
  };
}
