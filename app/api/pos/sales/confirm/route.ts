import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { CheckoutPaymentSplitSchema } from "@/lib/payments";
import { processSaleConfirmation } from "@/lib/sale-processing";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const ConfirmSaleInputSchema = z.object({
	id: z.string({ required_error: "ID da venda não informado." }),
	clienteId: z.string({ invalid_type_error: "Tipo não válido para ID do cliente." }).optional().nullable(),
	pagamentos: z.array(CheckoutPaymentSplitSchema.omit({ id: true })).min(1, { message: "Pelo menos um pagamento é obrigatório." }),
	cashbackResgate: z.number({ invalid_type_error: "Tipo não válido para resgate de cashback." }).default(0),
	cashbackProgramaId: z.string({ invalid_type_error: "Tipo não válido para ID do programa de cashback." }).optional().nullable(),
	contaDebitoId: z.string({ required_error: "Conta de débito não informada." }),
	contaCreditoId: z.string({ required_error: "Conta de crédito não informada." }),
});
export type TConfirmSaleInput = z.infer<typeof ConfirmSaleInputSchema>;

async function confirmSale({ input, session }: { input: TConfirmSaleInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
	});

	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const result = await processSaleConfirmation({
		organization,
		saleId: input.id,
		salePayments: input.pagamentos.map((pagamento) => ({
			metodo: pagamento.metodo,
			valor: pagamento.valor,
			parcela: pagamento.parcela ?? undefined,
			totalParcelas: pagamento.totalParcelas ?? undefined,
			efetivacaoTipo: pagamento.efetivacaoTipo,
			dataPrevisao: pagamento.dataPrevisao ?? undefined,
			primeiraDataPrevisaoParcela: pagamento.primeiraDataPrevisaoParcela ?? undefined,
			observacoes: pagamento.observacoes ?? undefined,
		})),
		saleAuthorId: session.user.id,
		saleClientId: input.clienteId,
		saleCashbackProgramId: input.cashbackProgramaId,
		saleCashbackRedemptionValue: input.cashbackResgate,
		accountingEntryDebitAccountId: input.contaDebitoId,
		accountingEntryCreditAccountId: input.contaCreditoId,
	});

	return {
		data: result,
		message: "Venda confirmada com sucesso.",
	};
}
export type TConfirmSaleOutput = Awaited<ReturnType<typeof confirmSale>>;

async function confirmSaleRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const body = await request.json();
	const input = ConfirmSaleInputSchema.parse({ ...body, id: searchParams.get("id") });
	const result = await confirmSale({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: confirmSaleRoute });
