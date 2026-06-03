import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { processSaleAutomaticFiscalEmissionIfEligible, processSaleCashbackAccumulationIfEligible } from "@/lib/sale-processing";
import { FinancialTransactionSchema } from "@/schemas/financial";
import { db } from "@/services/drizzle";
import { financialTransactions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const EffectFinancialTransactionInputSchema = z.object({
	transactionId: z.string({ required_error: "ID da transação não informado." }),
	transaction: FinancialTransactionSchema.pick({
		contaFinanceiraId: true,
		metodo: true,
		dataEfetivacao: true,
	}),
});
export type TEffectFinancialTransactionInput = z.infer<typeof EffectFinancialTransactionInputSchema>;

async function effectFinancialTransaction({ input, orgId, authorId }: { input: TEffectFinancialTransactionInput; orgId: string; authorId: string }) {
	const transaction = await db.query.financialTransactions.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.transactionId), eq(fields.organizacaoId, orgId)),
		with: {
			lancamentoContabil: {
				columns: { vendaId: true },
			},
		},
	});

	if (!transaction) throw new createHttpError.NotFound("Transação financeira não encontrada.");
	if (transaction.dataEfetivacao) throw new createHttpError.BadRequest("Esta transação já está efetivada.");

	if (input.transaction.contaFinanceiraId) {
		const account = await db.query.financialAccounts.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.transaction.contaFinanceiraId!), eq(fields.organizacaoId, orgId)),
			columns: { id: true },
		});

		if (!account) throw new createHttpError.NotFound("Conta financeira não encontrada para esta organização.");
	}

	const metodo = input.transaction.metodo ?? transaction.metodo;
	if (transaction.metodo !== "A_DEFINIR" && input.transaction.metodo && input.transaction.metodo !== transaction.metodo) {
		throw new createHttpError.BadRequest(`Somente transações com método "A DEFINIR" podem trocar o método na efetivação.`);
	}

	const [updated] = await db
		.update(financialTransactions)
		.set({
			dataEfetivacao: input.transaction.dataEfetivacao ? new Date(input.transaction.dataEfetivacao) : new Date(),
			contaFinanceiraId: input.transaction.contaFinanceiraId ?? transaction.contaFinanceiraId,
			metodo,
			provedorStatus: "APROVADO",
		})
		.where(and(eq(financialTransactions.id, input.transactionId), eq(financialTransactions.organizacaoId, orgId)))
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

	return {
		data: {
			transactionId: updated.id,
		},
		message: "Transação efetivada com sucesso.",
	};
}
export type TEffectFinancialTransactionOutput = Awaited<ReturnType<typeof effectFinancialTransaction>>;

async function effectFinancialTransactionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const body = await request.json();
	const input = EffectFinancialTransactionInputSchema.parse(body);
	const result = await effectFinancialTransaction({ input, orgId: session.membership.organizacao.id, authorId: session.user.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: effectFinancialTransactionRoute });
