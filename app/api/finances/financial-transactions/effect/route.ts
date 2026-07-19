import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { effectFinancialTransactionCore } from "@/lib/finances/effect-financial-transaction";
import { canEditFinances } from "@/lib/permissions/finances";
import { FinancialTransactionSchema } from "@/schemas/financial";
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
	const { transactionId } = await effectFinancialTransactionCore({
		transactionId: input.transactionId,
		orgId,
		authorId,
		dataEfetivacao: input.transaction.dataEfetivacao ? new Date(input.transaction.dataEfetivacao) : null,
		contaFinanceiraId: input.transaction.contaFinanceiraId,
		metodo: input.transaction.metodo,
	});

	return {
		data: {
			transactionId,
		},
		message: "Transação efetivada com sucesso.",
	};
}
export type TEffectFinancialTransactionOutput = Awaited<ReturnType<typeof effectFinancialTransaction>>;

async function effectFinancialTransactionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canEditFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para editar lançamentos financeiros.");

	const body = await request.json();
	const input = EffectFinancialTransactionInputSchema.parse(body);
	const result = await effectFinancialTransaction({ input, orgId: session.membership.organizacao.id, authorId: session.user.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: effectFinancialTransactionRoute });
