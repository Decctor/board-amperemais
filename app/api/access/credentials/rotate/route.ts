import { authenticateExternalRequest } from "@/lib/access/authentication";
import { rotatePrincipalCredential } from "@/lib/access/credentials";
import { getRequestClientInfo } from "@/lib/access/events";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RotateAccessCredentialInputSchema = z.object({
	// Exigido apenas no modo administrativo; na auto-rotação o principal vem da própria credencial.
	principalId: z
		.string({ invalid_type_error: "Tipo não válido para o ID do dispositivo." })
		.optional()
		.nullable(),
});
export type TRotateAccessCredentialInput = z.infer<typeof RotateAccessCredentialInputSchema>;

type TRotateAccessCredentialParams = {
	principalId: string;
	organizacaoId: string;
	enderecoIp: string | null;
	userAgent: string | null;
};
async function rotateAccessCredential({ principalId, organizacaoId, enderecoIp, userAgent }: TRotateAccessCredentialParams) {
	const rotation = await rotatePrincipalCredential({ principalId, organizacaoId, enderecoIp, userAgent });

	// O token é devolvido uma única vez; a credencial anterior permanece válida durante a janela de sobreposição.
	return {
		data: rotation,
		message: "Credencial rotacionada com sucesso. A credencial anterior expira em breve.",
	};
}
export type TRotateAccessCredentialOutput = Awaited<ReturnType<typeof rotateAccessCredential>>;

// Dois modos: auto-rotação pelo próprio dispositivo (Bearer token) ou rotação administrativa
// (sessão humana + permissão), quando o novo token precisa ser reinserido manualmente no aparelho.
async function rotateAccessCredentialRoute(request: NextRequest) {
	const { enderecoIp, userAgent } = getRequestClientInfo(request);

	const authorizationHeader = request.headers.get("authorization");
	if (authorizationHeader?.startsWith("Bearer ")) {
		const actor = await authenticateExternalRequest(request);
		const result = await rotateAccessCredential({
			principalId: actor.principalId,
			organizacaoId: actor.organizationId,
			enderecoIp,
			userAgent,
		});
		return NextResponse.json(result);
	}

	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.permissoes.empresa.editar)
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar dispositivos da organização.");

	const input = RotateAccessCredentialInputSchema.parse(await request.json());
	if (!input.principalId) throw new createHttpError.BadRequest("ID do dispositivo não informado.");

	const result = await rotateAccessCredential({
		principalId: input.principalId,
		organizacaoId: session.membership.organizacao.id,
		enderecoIp,
		userAgent,
	});
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: rotateAccessCredentialRoute });
