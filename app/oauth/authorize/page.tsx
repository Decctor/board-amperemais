import { Card, CardContent } from "@/components/ui/card";
import { resolveOauthAuthorizationContext } from "@/lib/access/oauth";
import { describeAccessScope } from "@/lib/access/scope-catalog";
import { getCurrentSession } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { organizationMembers } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { redirect } from "next/navigation";
import { AuthorizeConsent } from "./authorize-consent";

/**
 * Página de consentimento OAuth (authorization endpoint do fluxo authorization code + PKCE).
 *
 * Regra de segurança da RFC 6749 §4.1.2.1: erro de cliente/redirect_uri NUNCA redireciona —
 * renderiza a página de erro. Só depois de validar que a redirect_uri pertence ao cliente é
 * que qualquer erro pode voltar por redirect.
 *
 * O usuário escolhe QUAL organização autoriza (org-per-connection); admin de plataforma vê
 * também "Acesso geral". A página só monta as opções — quem decide é a rota de aprovação,
 * que revalida membership/permissão/admin do lado do servidor.
 */

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function AuthorizationErrorCard({ title, description }: { title: string; description: string }) {
	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6">
			<Card className="w-full max-w-md">
				<CardContent className="flex flex-col gap-2 p-8 text-center">
					<h1 className="text-xl font-semibold text-foreground">{title}</h1>
					<p className="text-sm text-muted-foreground">{description}</p>
				</CardContent>
			</Card>
		</div>
	);
}

function toScopeDescriptors(scopes: string[]) {
	return scopes.map((scopeKey) => {
		const descriptor = describeAccessScope(scopeKey);
		return { scope: scopeKey, label: descriptor.label, description: descriptor.description };
	});
}

export default async function OauthAuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
	const params = await searchParams;
	const clientId = first(params.client_id);
	const redirectUri = first(params.redirect_uri);
	const responseType = first(params.response_type);
	const scope = first(params.scope);
	const state = first(params.state);
	const codeChallenge = first(params.code_challenge);
	const codeChallengeMethod = first(params.code_challenge_method);
	const resource = first(params.resource);

	if (!clientId || !redirectUri) {
		return (
			<AuthorizationErrorCard
				title="Solicitação inválida"
				description="A aplicação não informou os parâmetros de autorização obrigatórios (client_id, redirect_uri)."
			/>
		);
	}

	const session = await getCurrentSession();
	if (!session) {
		// A volta pós-login preserva a query inteira — /oauth/authorize está na allowlist de redirect.
		const returnTo = `/oauth/authorize?${new URLSearchParams(
			Object.entries({
				client_id: clientId,
				redirect_uri: redirectUri,
				response_type: responseType,
				scope,
				state,
				code_challenge: codeChallenge,
				code_challenge_method: codeChallengeMethod,
				resource,
			}).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
		).toString()}`;
		redirect(`/auth/signin?redirectTo=${encodeURIComponent(returnTo)}`);
	}

	// Todas as organizações que o usuário PODE autorizar — não só a ativa na sessão. A rota de
	// aprovação refaz esta verificação; aqui é montagem de opções.
	const memberships = await db.query.organizationMembers.findMany({
		where: eq(organizationMembers.usuarioId, session.user.id),
		with: { organizacao: { columns: { id: true, nome: true } } },
	});
	const eligibleOrganizations = memberships
		.filter((membership) => membership.permissoes.empresa.editar && membership.organizacao)
		.map((membership) => ({ id: membership.organizacao.id, nome: membership.organizacao.nome }));

	// Cliente/redirect inválidos: página de erro, nunca redirect (não sabemos se a URI é do cliente).
	let authorization: Awaited<ReturnType<typeof resolveOauthAuthorizationContext>>;
	try {
		authorization = await resolveOauthAuthorizationContext({ clientId, redirectUri, scope });
	} catch (error) {
		const description = createHttpError.isHttpError(error) && error.expose ? error.message : "Não foi possível validar a aplicação solicitante.";
		return <AuthorizationErrorCard title="Aplicação não reconhecida" description={description} />;
	}

	// Acesso geral só aparece para admin E para aplicação cujo teto comporta platform:* —
	// o genérico AGENT_MCP falha aqui e a opção simplesmente não é oferecida. Os dois conjuntos
	// são resolvidos aqui para a tela poder mostrar o que muda ao ligar a gestão assistida.
	let platformScopes: string[] | null = null;
	let platformMutationScopes: string[] | null = null;
	if (session.user.admin) {
		try {
			const platformAuthorization = await resolveOauthAuthorizationContext({ clientId, redirectUri, scope, platform: true });
			platformScopes = platformAuthorization.scopes;
		} catch {
			platformScopes = null;
		}
		// Catch próprio: uma aplicação pode comportar leitura de plataforma sem comportar mutação,
		// e nesse caso o acesso geral continua sendo oferecido — só sem a gestão assistida.
		if (platformScopes) {
			try {
				const platformMutationAuthorization = await resolveOauthAuthorizationContext({
					clientId,
					redirectUri,
					scope,
					platform: true,
					platformMutations: true,
				});
				platformMutationScopes = platformMutationAuthorization.scopes;
			} catch {
				platformMutationScopes = null;
			}
		}
	}

	if (eligibleOrganizations.length === 0 && !platformScopes) {
		return (
			<AuthorizationErrorCard
				title="Permissão insuficiente"
				description="Autorizar uma conexão de IA cria uma credencial de acesso da organização, e nenhum dos seus vínculos tem permissão de edição da empresa. Peça a um administrador."
			/>
		);
	}

	// Daqui em diante a redirect_uri é confiável — erros de protocolo voltam para o cliente.
	if (responseType !== "code" || !codeChallenge || codeChallengeMethod !== "S256") {
		const errorRedirect = new URL(redirectUri);
		errorRedirect.searchParams.set("error", "invalid_request");
		errorRedirect.searchParams.set("error_description", "response_type=code e PKCE S256 são obrigatórios.");
		if (state) errorRedirect.searchParams.set("state", state);
		redirect(errorRedirect.href);
	}

	const activeOrganizationId = session.membership?.organizacao.id ?? null;
	const defaultOrganizationId =
		activeOrganizationId && eligibleOrganizations.some((organization) => organization.id === activeOrganizationId)
			? activeOrganizationId
			: (eligibleOrganizations[0]?.id ?? null);

	return (
		<AuthorizeConsent
			clientName={authorization.oauthClient.nome}
			connectorCode={authorization.oauthClient.cliente.codigo}
			userName={session.user.nome}
			organizations={eligibleOrganizations}
			defaultOrganizationId={defaultOrganizationId}
			platformScopeDescriptors={platformScopes ? toScopeDescriptors(platformScopes) : null}
			platformMutationScopeDescriptors={platformMutationScopes ? toScopeDescriptors(platformMutationScopes) : null}
			organizationScopeDescriptors={toScopeDescriptors(authorization.scopes)}
			authorizationParams={{
				clientId,
				redirectUri,
				scope: scope ?? null,
				state: state ?? null,
				codeChallenge,
				codeChallengeMethod: "S256",
				resource: resource ?? null,
			}}
		/>
	);
}
