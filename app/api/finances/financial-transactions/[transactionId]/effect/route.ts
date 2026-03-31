import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { PaymentMethodEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { financialTransactions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const EffectFinancialTransactionInputSchema = z.object({
	transactionId: z.string({ required_error: "ID da transação não informado." }),
	dataEfetivacao: z
		.string({ invalid_type_error: "Tipo não válido para data de efetivação." })
		.optional()
		.nullable(),
	contaFinanceiraId: z.string({ invalid_type_error: "Tipo não válido para conta financeira." }).optional().nullable(),
	metodo: PaymentMethodEnum.optional().nullable(),
});
export type TEffectFinancialTransactionInput = z.infer<typeof EffectFinancialTransactionInputSchema>;

async function effectFinancialTransaction({ input, orgId }: { input: TEffectFinancialTransactionInput; orgId: string }) {
	const transaction = await db.query.financialTransactions.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.transactionId), eq(fields.organizacaoId, orgId)),
	});

	if (!transaction) throw new createHttpError.NotFound("Transação financeira não encontrada.");
	if (transaction.dataEfetivacao) throw new createHttpError.BadRequest("Esta transação já está efetivada.");

	if (input.contaFinanceiraId) {
		const account = await db.query.financialAccounts.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.contaFinanceiraId!), eq(fields.organizacaoId, orgId)),
			columns: { id: true },
		});

		if (!account) throw new createHttpError.NotFound("Conta financeira não encontrada para esta organização.");
	}

	const metodo = input.metodo ?? transaction.metodo;
	if (transaction.metodo !== "A_DEFINIR" && input.metodo && input.metodo !== transaction.metodo) {
		throw new createHttpError.BadRequest("Somente transações com método A_DEFINIR podem trocar o método na efetivação.");
	}

	const [updated] = await db
		.update(financialTransactions)
		.set({
			dataEfetivacao: input.dataEfetivacao ? new Date(input.dataEfetivacao) : new Date(),
			contaFinanceiraId: input.contaFinanceiraId ?? transaction.contaFinanceiraId,
			metodo,
			provedorStatus: "APROVADO",
		})
		.where(and(eq(financialTransactions.id, input.transactionId), eq(financialTransactions.organizacaoId, orgId)))
		.returning({ id: financialTransactions.id });

	if (!updated) throw new createHttpError.InternalServerError("Não foi possível efetivar a transação.");

	return {
		data: {
			transactionId: updated.id,
		},
		message: "Transação efetivada com sucesso.",
	};
}
export type TEffectFinancialTransactionOutput = Awaited<ReturnType<typeof effectFinancialTransaction>>;

async function effectFinancialTransactionRoute(request: NextRequest, { params }: { params: Promise<{ transactionId: string }> }) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const body = await request.json().catch(() => ({}));
	const routeParams = await params;
	const input = EffectFinancialTransactionInputSchema.parse({
		...body,
		transactionId: routeParams.transactionId,
	});
	const result = await effectFinancialTransaction({ input, orgId: session.membership.organizacao.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: effectFinancialTransactionRoute });
