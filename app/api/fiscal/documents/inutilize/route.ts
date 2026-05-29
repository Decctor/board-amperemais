import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { inutilizeFiscalDocument } from "@/lib/fiscal/documents";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const InutilizeFiscalDocumentInputSchema = z.object({
	documentId: z.string({
		required_error: "ID do documento fiscal não informado.",
		invalid_type_error: "Tipo não válido para o ID do documento fiscal.",
	}),
	justificativa: z
		.string({
			required_error: "Justificativa da inutilização não informada.",
			invalid_type_error: "Tipo não válido para a justificativa da inutilização.",
		})
		.min(15, "A justificativa deve ter ao menos 15 caracteres.")
		.max(255, "A justificativa deve ter no máximo 255 caracteres."),
});
export type TInutilizeFiscalDocumentInput = z.infer<typeof InutilizeFiscalDocumentInputSchema>;

async function inutilizeFiscalDocumentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const sessionMembership = session.membership;
	if (!sessionMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!sessionMembership.permissoes.fiscal.cancelar) throw new createHttpError.Forbidden("Oops, você não possui permissão para inutilizar numeração fiscal.");

	const payload = await request.json();
	const input = InutilizeFiscalDocumentInputSchema.parse(payload);
	const result = await inutilizeFiscalDocument({
		organizationId: sessionMembership.organizacao.id,
		documentId: input.documentId,
		justificativa: input.justificativa,
		authorId: session.user.id,
	});
	return NextResponse.json({ data: result, message: "Inutilização de numeração registrada com sucesso." });
}
export type TInutilizeFiscalDocumentOutput = {
	data: Awaited<ReturnType<typeof inutilizeFiscalDocument>>;
	message: string;
};

export const POST = appApiHandler({ POST: inutilizeFiscalDocumentRoute });
