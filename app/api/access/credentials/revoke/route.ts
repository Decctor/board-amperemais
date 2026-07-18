import { revokeCredential } from "@/lib/access/credentials";
import { getRequestClientInfo } from "@/lib/access/events";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RevokeAccessCredentialInputSchema = z.object({
	credencialId: z.string({
		required_error: "ID da credencial não informado.",
		invalid_type_error: "Tipo não válido para o ID da credencial.",
	}),
});
export type TRevokeAccessCredentialInput = z.infer<typeof RevokeAccessCredentialInputSchema>;

type TRevokeAccessCredentialParams = {
	input: TRevokeAccessCredentialInput;
	organizacaoId: string;
	enderecoIp: string | null;
	userAgent: string | null;
};
async function revokeAccessCredential({ input, organizacaoId, enderecoIp, userAgent }: TRevokeAccessCredentialParams) {
	const revocation = await revokeCredential({ credencialId: input.credencialId, organizacaoId, enderecoIp, userAgent });
	return {
		data: revocation,
		message: "Credencial revogada com sucesso.",
	};
}
export type TRevokeAccessCredentialOutput = Awaited<ReturnType<typeof revokeAccessCredential>>;

async function revokeAccessCredentialRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.permissoes.empresa.editar)
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar dispositivos da organização.");

	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	const input = RevokeAccessCredentialInputSchema.parse(await request.json());
	const result = await revokeAccessCredential({ input, organizacaoId: session.membership.organizacao.id, enderecoIp, userAgent });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: revokeAccessCredentialRoute });
