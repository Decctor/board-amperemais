import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { registerFiscalCorrection } from "@/lib/fiscal/documents";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const CorrectFiscalDocumentInputSchema = z.object({
	documentId: z.string({
		required_error: "ID do documento fiscal não informado.",
		invalid_type_error: "Tipo não válido para o ID do documento fiscal.",
	}),
	correcao: z
		.string({
			required_error: "Texto da correção não informado.",
			invalid_type_error: "Tipo não válido para o texto da correção.",
		})
		.min(15, "A correção deve ter ao menos 15 caracteres.")
		.max(1000, "A correção deve ter no máximo 1000 caracteres."),
});
export type TCorrectFiscalDocumentInput = z.infer<typeof CorrectFiscalDocumentInputSchema>;

async function correctFiscalDocumentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const sessionMembership = session.membership;
	if (!sessionMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!sessionMembership.permissoes.fiscal.emitir) throw new createHttpError.Forbidden("Oops, você não possui permissão para emitir documentos fiscais.");

	const payload = await request.json();
	const input = CorrectFiscalDocumentInputSchema.parse(payload);
	const result = await registerFiscalCorrection({
		organizationId: sessionMembership.organizacao.id,
		documentId: input.documentId,
		correcao: input.correcao,
		authorId: session.user.id,
	});
	return NextResponse.json({ data: result, message: "Carta de correção registrada com sucesso." });
}
export type TCorrectFiscalDocumentOutput = {
	data: Awaited<ReturnType<typeof registerFiscalCorrection>>;
	message: string;
};

export const POST = appApiHandler({ POST: correctFiscalDocumentRoute });
