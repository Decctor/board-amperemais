import { appApiHandler } from "@/lib/app-api";
import { requireERPSession } from "@/lib/authentication/erp-session";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { processTabOrderStatusChange } from "@/lib/tabs";
import { SaleAttendanceStatusEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const UpdateTabOrderStatusInputSchema = z.object({
	tabOrderId: z.string({ required_error: "ID do pedido nao informado." }),
	status: SaleAttendanceStatusEnum,
});
export type TUpdateTabOrderStatusInput = z.infer<typeof UpdateTabOrderStatusInputSchema>;

async function updateTabOrderStatus({ input, session }: { input: TUpdateTabOrderStatusInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
	});
	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");

	const result = await processTabOrderStatusChange({
		organization,
		tabOrderId: input.tabOrderId,
		targetStatus: input.status,
		authorId: session.user.id,
	});

	return {
		data: result,
		message: "Status do pedido atualizado com sucesso.",
	};
}
export type TUpdateTabOrderStatusOutput = Awaited<ReturnType<typeof updateTabOrderStatus>>;

async function updateTabOrderStatusRoute(request: NextRequest) {
	const session = requireERPSession(await getCurrentSessionUncached());

	const body = await request.json();
	const input = UpdateTabOrderStatusInputSchema.parse(body);
	const result = await updateTabOrderStatus({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: updateTabOrderStatusRoute });
