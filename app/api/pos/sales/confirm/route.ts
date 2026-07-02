import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { CheckoutPaymentSplitSchema, getOrganizationPaymentMethodsConfig } from "@/lib/payments";
import { processSaleConfirmation } from "@/lib/sales/sale-processing";
import { AppliedCouponSchema, type TAppliedCoupon } from "@/schemas/coupons";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const ConfirmSaleInputSchema = z.object({
	id: z.string({ required_error: "ID da venda nao informado." }),
	clienteId: z.string({ invalid_type_error: "Tipo nao valido para ID do cliente." }).optional().nullable(),
	pagamentos: z.array(CheckoutPaymentSplitSchema.omit({ id: true })),
	cashbackResgate: z.number({ invalid_type_error: "Tipo nao valido para resgate de cashback." }).default(0),
	cashbackProgramaId: z.string({ invalid_type_error: "Tipo nao valido para ID do programa de cashback." }).optional().nullable(),
	cupomResgate: AppliedCouponSchema.optional().nullable(),
	contaDebitoId: z.string({ invalid_type_error: "Tipo nao valido para conta de debito." }).optional().nullable(),
	contaCreditoId: z.string({ invalid_type_error: "Tipo nao valido para conta de credito." }).optional().nullable(),
});
export type TConfirmSaleInput = z.infer<typeof ConfirmSaleInputSchema>;

async function confirmSale({ input, session }: { input: TConfirmSaleInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const [organization, saleDraft] = await Promise.all([
		db.query.organizations.findFirst({
			where: (fields, { eq }) => eq(fields.id, orgId),
		}),
		db.query.sales.findFirst({
			where: and(eq(sales.id, input.id), eq(sales.organizacaoId, orgId)),
			columns: { id: true, rascunhoMetadados: true },
		}),
	]);

	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");
	if (!saleDraft) throw new createHttpError.NotFound("Venda nao encontrada.");

	const organizationSaleDefaults = organization.configuracao.defaults.contabilidade.lancamentosPadrao.vendas;
	const accountingEntryDebitAccountId = input.contaDebitoId ?? organizationSaleDefaults.debitoContaId;
	const accountingEntryCreditAccountId = input.contaCreditoId ?? organizationSaleDefaults.creditoContaId;
	if (!accountingEntryDebitAccountId || !accountingEntryCreditAccountId) {
		throw new createHttpError.InternalServerError("A organizacao nao possui contas padrao de vendas configuradas.");
	}

	const organizationPaymentMethodDefaults = getOrganizationPaymentMethodsConfig(organization.configuracao);
	const shopMetadata = saleDraft.rascunhoMetadados as {
		shop?: {
			cashbackResgateSolicitado?: number;
			cashbackProgramaId?: string | null;
		};
		cupom?: TAppliedCoupon | null;
	} | null;
	const effectiveCashbackResgate = input.cashbackResgate > 0 ? input.cashbackResgate : (shopMetadata?.shop?.cashbackResgateSolicitado ?? 0);
	const effectiveCashbackProgramaId = input.cashbackProgramaId ?? shopMetadata?.shop?.cashbackProgramaId ?? null;
	// O cupom aplicado no rascunho ja esta refletido nos totais da venda; aqui apenas resolve qual registrar no ledger.
	const effectiveAppliedCoupon = input.cupomResgate ?? shopMetadata?.cupom ?? null;

	const result = await processSaleConfirmation({
		organization,
		saleId: input.id,
		salePayments: input.pagamentos.map((pagamento) => {
			const methodDefaults = organizationPaymentMethodDefaults[pagamento.metodo];
			if (!methodDefaults?.suportado) {
				throw new createHttpError.BadRequest(`O metodo de pagamento ${pagamento.metodo} nao esta habilitado para esta organizacao.`);
			}

			return {
				metodo: pagamento.metodo,
				valor: pagamento.valor,
				totalParcelas: pagamento.totalParcelas ?? undefined,
				efetivacaoTipo: pagamento.efetivacaoTipo,
				dataPrevisao: pagamento.dataPrevisao ?? undefined,
				observacoes: pagamento.observacoes ?? undefined,
				contaFinanceiraPadraoId: methodDefaults.contaFinanceiraPadraoId ?? null,
			};
		}),
		saleAuthorId: session.user.id,
		saleClientId: input.clienteId,
		saleCashbackProgramId: effectiveCashbackProgramaId,
		saleCashbackRedemptionValue: effectiveCashbackResgate,
		saleCouponId: effectiveAppliedCoupon?.cupomId ?? null,
		saleCouponDeclaredDiscountValue: effectiveAppliedCoupon?.valorDesconto ?? null,
		accountingEntryDebitAccountId,
		accountingEntryCreditAccountId,
	});

	return {
		data: result,
		message: "Venda confirmada com sucesso.",
	};
}
export type TConfirmSaleOutput = Awaited<ReturnType<typeof confirmSale>>;

async function confirmSaleRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");

	const { searchParams } = new URL(request.url);
	const body = await request.json();
	const input = ConfirmSaleInputSchema.parse({ ...body, id: searchParams.get("id") });
	const result = await confirmSale({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: confirmSaleRoute });
