import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { manifestInboundDocument } from "@/lib/fiscal/inbound";
import { FiscalInboundManifestEventEnum } from "@/schemas/enums";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const ManifestInboundInputSchema = z.object({
	inboundId: z.string({ required_error: "ID da nota recebida não informado.", invalid_type_error: "Tipo não válido para o ID da nota recebida." }),
	evento: FiscalInboundManifestEventEnum,
	justificativa: z.string({ invalid_type_error: "Tipo não válido para a justificativa." }).min(15).max(255).optional().nullable(),
});
export type TManifestInboundInput = z.infer<typeof ManifestInboundInputSchema>;

async function manifestInboundRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const sessionMembership = session.membership;
	if (!sessionMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!sessionMembership.permissoes.fiscal.emitir) throw new createHttpError.Forbidden("Oops, você não possui permissão para manifestar notas recebidas.");

	const input = ManifestInboundInputSchema.parse(await request.json());
	if ((input.evento === "DESCONHECIMENTO" || input.evento === "NAO_REALIZADA") && !input.justificativa) {
		throw new createHttpError.BadRequest("Justificativa obrigatória para desconhecimento / operação não realizada.");
	}
	const result = await manifestInboundDocument({ organizationId: sessionMembership.organizacao.id, inboundId: input.inboundId, evento: input.evento, justificativa: input.justificativa });
	return NextResponse.json({ data: result, message: "Manifestação registrada com sucesso." });
}
export type TManifestInboundOutput = { data: Awaited<ReturnType<typeof manifestInboundDocument>>; message: string };

export const POST = appApiHandler({ POST: manifestInboundRoute });
