import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { applyChannelFulfillmentTransition, getChannelErpPolicy, resolveFulfillmentChannelForSale } from "@/lib/sales/fulfillment-channels";
import { processSaleAttendanceStatusChange } from "@/lib/sales/sale-processing";
import { PaymentMethodEnum, SaleAttendanceStatusEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// INPUT SCHEMA
// ============================================================================

const UpdateSaleAttendanceStatusInputSchema = z.object({
	id: z.string({ required_error: "ID da venda não informado." }),
	attendanceStatus: SaleAttendanceStatusEnum,
	settlePendingPayment: z.boolean({ invalid_type_error: "Tipo não válido para confirmação de pagamento." }).optional().default(false),
	allowUnpaidDelivery: z.boolean({ invalid_type_error: "Tipo não válido para entrega sem recebimento." }).optional().default(false),
	paymentMethod: PaymentMethodEnum.optional().nullable(),
	financialAccountId: z.string({ invalid_type_error: "Tipo não válido para conta financeira." }).optional().nullable(),
	// Canais gerenciados (ex.: iFood): motivo exigido pelo canal ao cancelar o pedido.
	cancellationCode: z.string({ invalid_type_error: "Tipo não válido para o motivo de cancelamento." }).optional().nullable(),
});
export type TUpdateSaleAttendanceStatusInput = z.infer<typeof UpdateSaleAttendanceStatusInputSchema>;

// ============================================================================
// SERVICE
// ============================================================================

async function updateSaleAttendanceStatus({ input, session }: { input: TUpdateSaleAttendanceStatusInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;
	if (input.allowUnpaidDelivery && !session.membership!.permissoes.vendas.editar) {
		throw new createHttpError.Forbidden("Você não possui permissão para entregar pedidos sem recebimento.");
	}

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, orgId)),
		columns: { id: true, idExterno: true, modelo: true, processamentoOrigem: true, statusAtendimento: true },
	});
	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");

	// Canal gerenciado (ex.: iFood): a ação externa acontece ANTES do estado local — se o canal
	// rejeitar, nada muda. Cancelamento é assíncrono: o estado local só muda com o evento do canal.
	const policy = getChannelErpPolicy(organization.configuracao);
	const channel = resolveFulfillmentChannelForSale(sale, policy);
	if (channel) {
		const channelResult = await applyChannelFulfillmentTransition({
			channel,
			organizacaoId: orgId,
			orderId: sale.idExterno,
			fromStatus: sale.statusAtendimento,
			toStatus: input.attendanceStatus,
			cancellationCode: input.cancellationCode,
		});

		if (!channelResult.appliedLocally) {
			return {
				data: {
					saleId: sale.id,
					statusAtendimentoAnterior: sale.statusAtendimento,
					statusAtendimento: sale.statusAtendimento,
				},
				message: "Solicitação enviada ao canal. O pedido será atualizado quando o canal confirmar.",
			};
		}
	}

	const result = await processSaleAttendanceStatusChange({
		organization,
		saleId: input.id,
		targetStatus: input.attendanceStatus,
		authorId: session.user.id,
		settlePendingPayment: input.settlePendingPayment,
		allowUnpaidDelivery: channel ? true : input.allowUnpaidDelivery,
		paymentMethod: input.paymentMethod,
		financialAccountId: input.financialAccountId,
		enableStockDeduction: channel ? policy.estoque : true,
		enableAutomaticFiscalEmission: channel ? policy.fiscal : true,
	});

	return {
		data: result,
		message: "Status de atendimento atualizado com sucesso.",
	};
}
export type TUpdateSaleAttendanceStatusOutput = Awaited<ReturnType<typeof updateSaleAttendanceStatus>>;

// ============================================================================
// HANDLER
// ============================================================================

async function updateSaleAttendanceStatusRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const body = await request.json();
	const input = UpdateSaleAttendanceStatusInputSchema.parse(body);
	const result = await updateSaleAttendanceStatus({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: updateSaleAttendanceStatusRoute });
