import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { syncFiscalDocument } from "@/lib/fiscal/documents";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const SyncFiscalDocumentInputSchema = z.object({
	documentId: z.string({
		required_error: "ID do documento fiscal não informado.",
		invalid_type_error: "Tipo não válido para o ID do documento fiscal.",
	}),
});
export type TSyncFiscalDocumentInput = z.infer<typeof SyncFiscalDocumentInputSchema>;

async function syncFiscalDocumentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const sessionMembership = session.membership;
	if (!sessionMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	const userHasFiscalSyncPermission = sessionMembership.permissoes.fiscal.emitir;
	if (!userHasFiscalSyncPermission) throw new createHttpError.Forbidden("Oops, você não possui permissão para sincronizar documentos fiscais.");

	const payload = await request.json();
	const input = SyncFiscalDocumentInputSchema.parse(payload);
	const result = await syncFiscalDocument({
		organizationId: sessionMembership.organizacao.id,
		documentId: input.documentId,
		authorId: session.user.id,
	});
	return NextResponse.json({
		data: result,
		message: "Status do documento fiscal atualizado com sucesso.",
	});
}
export type TSyncFiscalDocumentOutput = {
	data: Awaited<ReturnType<typeof syncFiscalDocument>>;
	message: string;
};

export const POST = appApiHandler({ POST: syncFiscalDocumentRoute });
