import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { transferTab } from "@/lib/tabs";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const TransferTabInputSchema = z.object({
	tabId: z.string({ required_error: "ID da conta nao informado." }),
	servicePointDestinoId: z.string({ required_error: "ID do ponto de destino nao informado." }),
	motivo: z.string({ invalid_type_error: "Tipo nao valido para motivo." }).optional().nullable(),
});
export type TTransferTabRouteInput = z.infer<typeof TransferTabInputSchema>;

async function transferTabService({ input, session }: { input: TTransferTabRouteInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;
	const result = await transferTab({ orgId, userId: session.user.id, input });

	return {
		data: result,
		message: "Conta transferida com sucesso.",
	};
}
export type TTransferTabOutput = Awaited<ReturnType<typeof transferTabService>>;

async function transferTabRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organizacao nao possui acesso ao modulo de ERP.");
	}

	const body = await request.json();
	const input = TransferTabInputSchema.parse(body);
	const result = await transferTabService({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: transferTabRoute });
