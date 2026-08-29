import { resolveOauthAuthorizationContext } from "@/lib/access/oauth";
import { describeAccessScope } from "@/lib/access/scope-catalog";
import { getCurrentSession } from "@/lib/authentication/session";
import { Card, CardContent } from "@/components/ui/card";
import createHttpError from "http-errors";
import { redirect } from "next/navigation";
import { AuthorizeConsent } from "./authorize-consent";

/**
 * Página de consentimento OAuth (authorization endpoint do fluxo authorization code + PKCE).
 *
 * Regra de segurança da RFC 6749 §4.1.2.1: erro de cliente/redirect_uri NUNCA redireciona —
 * renderiza a página de erro. Só depois de validar que a redirect_uri pertence ao cliente é
 * que qualquer erro pode voltar por redirect.
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
	if (!session.membership) {
		return (
			<AuthorizationErrorCard
				title="Nenhuma organização ativa"
				description="Para autorizar uma conexão de IA você precisa estar vinculado a uma organização. Conclua o onboarding no painel e tente novamente."
			/>
		);
	}
	if (!session.membership.permissoes.empresa.editar) {
		return (
			<AuthorizationErrorCard
				title="Permissão insuficiente"
				description="Autorizar uma conexão de IA cria uma credencial de acesso da organização, e o seu perfil não tem permissão de edição da empresa. Peça a um administrador."
			/>
		);
	}

	// Cliente/redirect inválidos: página de erro, nunca redirect (não sabemos se a URI é do cliente).
	let authorization: Awaited<ReturnType<typeof resolveOauthAuthorizationContext>>;
	try {
		authorization = await resolveOauthAuthorizationContext({ clientId, redirectUri, scope });
	} catch (error) {
		const description = createHttpError.isHttpError(error) && error.expose ? error.message : "Não foi possível validar a aplicação solicitante.";
		return <AuthorizationErrorCard title="Aplicação não reconhecida" description={description} />;
	}

	// Daqui em diante a redirect_uri é confiável — erros de protocolo voltam para o cliente.
	if (responseType !== "code" || !codeChallenge || codeChallengeMethod !== "S256") {
		const errorRedirect = new URL(redirectUri);
		errorRedirect.searchParams.set("error", "invalid_request");
		errorRedirect.searchParams.set("error_description", "response_type=code e PKCE S256 são obrigatórios.");
		if (state) errorRedirect.searchParams.set("state", state);
		redirect(errorRedirect.href);
	}

	const scopeDescriptors = authorization.scopes.map((scopeKey) => {
		const descriptor = describeAccessScope(scopeKey);
		return { scope: scopeKey, label: descriptor.label, description: descriptor.description };
	});

	return (
		<AuthorizeConsent
			clientName={authorization.oauthClient.nome}
			organizationName={session.membership.organizacao.nome}
			userName={session.user.nome}
			scopeDescriptors={scopeDescriptors}
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
