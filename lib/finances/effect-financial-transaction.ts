import { processSaleAutomaticFiscalEmissionIfEligible, processSaleCashbackAccumulationIfEligible } from "@/lib/sales/sale-processing";
import type { TPaymentMethodEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { financialTransactions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

/**
 * Efetivação de uma transação financeira pendente — service compartilhado entre a rota
 * financial-transactions/effect e a conciliação bancária ("efetivar & conciliar").
 * Mantém os gatilhos pós-efetivação de vendas (cashback e emissão fiscal automática).
 */
export async function effectFinancialTransactionCore({
	transactionId,
	orgId,
	authorId,
	dataEfetivacao,
	contaFinanceiraId,
	metodo,
}: {
	transactionId: string;
	orgId: string;
	authorId: string;
	dataEfetivacao?: Date | null;
	contaFinanceiraId?: string | null;
	metodo?: TPaymentMethodEnum | null;
}) {
	const transaction = await db.query.financialTransactions.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, transactionId), eq(fields.organizacaoId, orgId)),
		with: {
			lancamentoContabil: {
				columns: { vendaId: true },
			},
		},
	});

	if (!transaction) throw new createHttpError.NotFound("Transação financeira não encontrada.");
	if (transaction.dataEfetivacao) throw new createHttpError.BadRequest("Esta transação já está efetivada.");

	if (contaFinanceiraId) {
		const account = await db.query.financialAccounts.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, contaFinanceiraId), eq(fields.organizacaoId, orgId)),
			columns: { id: true },
		});

		if (!account) throw new createHttpError.NotFound("Conta financeira não encontrada para esta organização.");
	}

	const effectiveMethod = metodo ?? transaction.metodo;
	if (transaction.metodo !== "A_DEFINIR" && metodo && metodo !== transaction.metodo) {
		throw new createHttpError.BadRequest(`Somente transações com método "A DEFINIR" podem trocar o método na efetivação.`);
	}

	const [updated] = await db
		.update(financialTransactions)
		.set({
			dataEfetivacao: dataEfetivacao ?? new Date(),
			contaFinanceiraId: contaFinanceiraId ?? transaction.contaFinanceiraId,
			metodo: effectiveMethod,
			provedorStatus: "APROVADO",
		})
		.where(and(eq(financialTransactions.id, transactionId), eq(financialTransactions.organizacaoId, orgId)))
		.returning({ id: financialTransactions.id });

	if (!updated) throw new createHttpError.InternalServerError("Não foi possível efetivar a transação.");

	const saleId = transaction.lancamentoContabil?.vendaId;
	if (saleId) {
		const organization = await db.query.organizations.findFirst({ where: (fields, { eq }) => eq(fields.id, orgId) });
		if (organization) {
			await processSaleCashbackAccumulationIfEligible({ organizationId: orgId, saleId, authorId });
			await processSaleAutomaticFiscalEmissionIfEligible({ organization, saleId, authorId });
		}
	}

	return { transactionId: updated.id };
}
