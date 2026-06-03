import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { processSaleAttendanceStatusChange } from "@/lib/sale-processing";
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

	const result = await processSaleAttendanceStatusChange({
		organization,
		saleId: input.id,
		targetStatus: input.attendanceStatus,
		authorId: session.user.id,
		settlePendingPayment: input.settlePendingPayment,
		allowUnpaidDelivery: input.allowUnpaidDelivery,
		paymentMethod: input.paymentMethod,
		financialAccountId: input.financialAccountId,
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
