import { getRequestClientInfo } from "@/lib/access/events";
import { issueOauthAuthorizationCode } from "@/lib/access/oauth";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Aprovação do consentimento OAuth: chamado pela página /oauth/authorize quando o usuário
 * confirma. Ao contrário de /api/oauth/register e /api/oauth/token (falam com bibliotecas
 * OAuth), este endpoint é interno — sessão Lucia e envelope padrão da aplicação.
 *
 * Org-per-connection: a organização autorizada é SEMPRE a ativa na sessão. Conectar outra
 * organização é trocar de organização no painel e autorizar de novo — o mesmo modelo de
 * instalação por organização dos demais principals.
 */

const ApproveOauthAuthorizationInputSchema = z.object({
	clientId: z.string({ required_error: "Informe o cliente OAuth.", invalid_type_error: "Tipo inválido para o cliente OAuth." }),
	redirectUri: z.string({ required_error: "Informe a redirect_uri.", invalid_type_error: "Tipo inválido para a redirect_uri." }),
	scope: z.string({ invalid_type_error: "Tipo inválido para scope." }).optional().nullable(),
	state: z.string({ invalid_type_error: "Tipo inválido para state." }).optional().nullable(),
	// Limites da RFC 7636 §4.1 aplicados ao challenge, que tem o mesmo alfabeto do verifier.
	codeChallenge: z
		.string({ required_error: "PKCE é obrigatório.", invalid_type_error: "Tipo inválido para code_challenge." })
		.min(43, "code_challenge fora do tamanho da RFC 7636.")
		.max(128, "code_challenge fora do tamanho da RFC 7636."),
	codeChallengeMethod: z.literal("S256", { errorMap: () => ({ message: "Apenas o método PKCE S256 é suportado." }) }),
	resource: z.string({ invalid_type_error: "Tipo inválido para resource." }).optional().nullable(),
});
export type TApproveOauthAuthorizationInput = z.infer<typeof ApproveOauthAuthorizationInputSchema>;

async function approveOauthAuthorization({
	input,
	organizacaoId,
	usuarioId,
	enderecoIp,
	userAgent,
}: {
	input: TApproveOauthAuthorizationInput;
	organizacaoId: string;
	usuarioId: string;
	enderecoIp: string | null;
	userAgent: string | null;
}) {
	const { code } = await issueOauthAuthorizationCode({
		clientId: input.clientId,
		redirectUri: input.redirectUri,
		scope: input.scope,
		codeChallenge: input.codeChallenge,
		resource: input.resource,
		organizacaoId,
		usuarioId,
		enderecoIp,
		userAgent,
	});

	const redirectUrl = new URL(input.redirectUri);
	redirectUrl.searchParams.set("code", code);
	if (input.state) redirectUrl.searchParams.set("state", input.state);

	return { data: { redirectUrl: redirectUrl.href }, message: "Autorização concedida." };
}
export type TApproveOauthAuthorizationOutput = Awaited<ReturnType<typeof approveOauthAuthorization>>;

async function approveOauthAuthorizationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	// Mesma permissão da criação manual de conexões de IA: consentir OAuth é provisionar credencial.
	if (!session.membership.permissoes.empresa.editar)
		throw new createHttpError.Forbidden("Você não possui permissão para autorizar conexões de IA na organização.");

	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	const input = ApproveOauthAuthorizationInputSchema.parse(await request.json());
	const result = await approveOauthAuthorization({
		input,
		organizacaoId: session.membership.organizacao.id,
		usuarioId: session.user.id,
		enderecoIp,
		userAgent,
	});
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: approveOauthAuthorizationRoute });
