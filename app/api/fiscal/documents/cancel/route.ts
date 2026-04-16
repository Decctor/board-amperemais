import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { cancelFiscalDocument } from "@/lib/fiscal/documents";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const CancelFiscalDocumentInputSchema = z.object({
	documentId: z.string({
		required_error: "ID do documento fiscal não informado.",
		invalid_type_error: "Tipo não válido para o ID do documento fiscal.",
	}),
	motivo: z.string({
		required_error: "Motivo do cancelamento não informado.",
		invalid_type_error: "Tipo não válido para o motivo do cancelamento.",
	}),
});
export type TCancelFiscalDocumentInput = z.infer<typeof CancelFiscalDocumentInputSchema>;

async function cancelFiscalDocumentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const userHasFiscalCancelPermission = session.membership?.permissoes.fiscal.cancelar;
	if (!userHasFiscalCancelPermission) throw new createHttpError.Forbidden("Oops, você não possui permissão para cancelar documentos fiscais.");

	const payload = await request.json();
	const input = CancelFiscalDocumentInputSchema.parse(payload);
	const result = await cancelFiscalDocument({ documentoId: input.documentId, motivo: input.motivo, autorId: session.user.id });
	return NextResponse.json({
		data: result,
		message: "Cancelamento fiscal solicitado com sucesso.",
	});
}
export type TCancelFiscalDocumentOutput = Awaited<ReturnType<typeof cancelFiscalDocument>>;

export const POST = appApiHandler({ POST: cancelFiscalDocumentRoute });
