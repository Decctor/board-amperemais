import { getRequestClientInfo } from "@/lib/access/events";
import { issueOauthAuthorizationCode } from "@/lib/access/oauth";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { organizationMembers } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Aprovação do consentimento OAuth: chamado pela página /oauth/authorize quando o usuário
 * confirma. Ao contrário de /api/oauth/register e /api/oauth/token (falam com bibliotecas
 * OAuth), este endpoint é interno — sessão Lucia e envelope padrão da aplicação.
 *
 * Org-per-connection com escolha explícita: o usuário aponta QUAL organização autoriza, e a
 * rota valida a membership + permissão daquela organização — nunca a organização ativa da
 * sessão, que a página usa só como pré-seleção. `organizationId` nulo é o consentimento de
 * plataforma (CONTA_PLATAFORMA), reservado a `user.admin`; a página só oferece a opção ao
 * admin, mas a decisão vale pelo que ESTA rota verifica.
 */

const ApproveOauthAuthorizationInputSchema = z.object({
	clientId: z.string({ required_error: "Informe o cliente OAuth.", invalid_type_error: "Tipo inválido para o cliente OAuth." }),
	redirectUri: z.string({ required_error: "Informe a redirect_uri.", invalid_type_error: "Tipo inválido para a redirect_uri." }),
	// Nulo = acesso geral (plataforma). Chave obrigatória de propósito: um cliente antigo que
	// não envia o campo deve falhar alto, não virar plataforma por omissão.
	organizationId: z.string({ invalid_type_error: "Tipo inválido para a organização." }).nullable(),
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
	usuarioId,
	enderecoIp,
	userAgent,
}: {
	input: TApproveOauthAuthorizationInput;
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
		organizacaoId: input.organizationId,
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

	const input = ApproveOauthAuthorizationInputSchema.parse(await request.json());

	if (input.organizationId === null) {
		// Acesso geral: só admin de plataforma. O teto de scopes do catálogo é a segunda rede —
		// um cliente sem platform:* no teto falha dentro de issueOauthAuthorizationCode.
		if (!session.user.admin) throw new createHttpError.Forbidden("Acesso de plataforma é restrito a administradores.");
	} else {
		// Mesma permissão da criação manual de conexões de IA, verificada na organização
		// ESCOLHIDA — a organização ativa da sessão é irrelevante aqui.
		const membership = await db.query.organizationMembers.findFirst({
			where: and(eq(organizationMembers.usuarioId, session.user.id), eq(organizationMembers.organizacaoId, input.organizationId)),
		});
		if (!membership) throw new createHttpError.Forbidden("Você não é membro da organização escolhida.");
		if (!membership.permissoes.empresa.editar)
			throw new createHttpError.Forbidden("Você não possui permissão para autorizar conexões de IA nesta organização.");
	}

	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	const result = await approveOauthAuthorization({
		input,
		usuarioId: session.user.id,
		enderecoIp,
		userAgent,
	});
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: approveOauthAuthorizationRoute });
