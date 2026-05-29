import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { createReturnFiscalDocument } from "@/lib/fiscal/documents";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const ReturnFiscalDocumentInputSchema = z.object({
	documentId: z.string({
		required_error: "ID do documento fiscal não informado.",
		invalid_type_error: "Tipo não válido para o ID do documento fiscal.",
	}),
	operationProfileId: z.string({ invalid_type_error: "Tipo não válido para o ID do perfil de operação." }).optional().nullable(),
});
export type TReturnFiscalDocumentInput = z.infer<typeof ReturnFiscalDocumentInputSchema>;

async function returnFiscalDocumentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const sessionMembership = session.membership;
	if (!sessionMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!sessionMembership.permissoes.fiscal.emitir) throw new createHttpError.Forbidden("Oops, você não possui permissão para emitir documentos fiscais.");

	const payload = await request.json();
	const input = ReturnFiscalDocumentInputSchema.parse(payload);
	const result = await createReturnFiscalDocument({
		organizationId: sessionMembership.organizacao.id,
		originalDocumentId: input.documentId,
		operationProfileId: input.operationProfileId ?? null,
		authorId: session.user.id,
	});
	return NextResponse.json({ data: result, message: "NF-e de devolução gerada e enfileirada com sucesso." });
}
export type TReturnFiscalDocumentOutput = {
	data: Awaited<ReturnType<typeof createReturnFiscalDocument>>;
	message: string;
};

export const POST = appApiHandler({ POST: returnFiscalDocumentRoute });
