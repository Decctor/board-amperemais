import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { processSaleAttendanceStatusChange } from "@/lib/sale-processing";
import { SaleAttendanceStatusEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// INPUT SCHEMA
// ============================================================================

const UpdateSaleAttendanceStatusInputSchema = z.object({
	id: z.string({ required_error: "ID da venda não informado." }),
	statusAtendimento: SaleAttendanceStatusEnum,
});
export type TUpdateSaleAttendanceStatusInput = z.infer<typeof UpdateSaleAttendanceStatusInputSchema>;

// ============================================================================
// SERVICE
// ============================================================================

async function updateSaleAttendanceStatus({ input, session }: { input: TUpdateSaleAttendanceStatusInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const result = await processSaleAttendanceStatusChange({
		organization,
		saleId: input.id,
		targetStatus: input.statusAtendimento,
		authorId: session.user.id,
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
