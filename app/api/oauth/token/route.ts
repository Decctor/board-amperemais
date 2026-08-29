import { getRequestClientInfo } from "@/lib/access/events";
import { exchangeOauthAuthorizationCode, OauthTokenError } from "@/lib/access/oauth";
import { OAUTH_CORS_HEADERS } from "@/lib/access/oauth-metadata";
import { assertOauthTokenAttemptAllowed } from "@/lib/access/rate-limit";
import { appApiHandler } from "@/lib/app-api";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Endpoint de token (RFC 6749 §4.1.3, perfil OAuth 2.1): troca o authorization code + PKCE
 * verifier pelo access token. O token devolvido é uma CHAVE_API do modelo de acesso — opaca,
 * revogável no painel, verificada a cada requisição MCP. Sem refresh token: o token não
 * expira, e revogar + reconectar é o caminho de recuperação (mesma filosofia das credenciais
 * de dispositivo).
 *
 * Erros no vocabulário da RFC (`error`/`error_description`) — clientes OAuth não conhecem o
 * envelope da aplicação.
 */

export const dynamic = "force-dynamic";

function tokenError(error: OauthTokenError["error"] | "invalid_request", description: string, status = 400) {
	return NextResponse.json({ error, error_description: description }, { status, headers: OAUTH_CORS_HEADERS });
}

// A RFC manda form-urlencoded; JSON é aceito por tolerância a clientes fora da letra da spec.
async function parseTokenRequestBody(request: NextRequest): Promise<Record<string, string> | null> {
	const contentType = request.headers.get("content-type") ?? "";
	try {
		if (contentType.includes("application/json")) {
			const body = await request.json();
			return typeof body === "object" && body !== null ? (body as Record<string, string>) : null;
		}
		const text = await request.text();
		return Object.fromEntries(new URLSearchParams(text));
	} catch {
		return null;
	}
}

async function oauthTokenRoute(request: NextRequest) {
	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	await assertOauthTokenAttemptAllowed({ enderecoIp });

	const body = await parseTokenRequestBody(request);
	if (!body) return tokenError("invalid_request", "Corpo da requisição ilegível.");

	if (body.grant_type !== "authorization_code") {
		return tokenError("unsupported_grant_type", "Apenas authorization_code é suportado.");
	}
	if (!body.code || !body.client_id || !body.redirect_uri || !body.code_verifier) {
		return tokenError("invalid_request", "Parâmetros obrigatórios: code, client_id, redirect_uri, code_verifier.");
	}

	try {
		const result = await exchangeOauthAuthorizationCode({
			code: body.code,
			clientId: body.client_id,
			redirectUri: body.redirect_uri,
			codeVerifier: body.code_verifier,
			enderecoIp,
			userAgent,
		});

		return NextResponse.json(
			{
				access_token: result.accessToken,
				token_type: "Bearer",
				scope: result.scopes.join(" "),
			},
			{ status: 200, headers: { ...OAUTH_CORS_HEADERS, "Cache-Control": "no-store", Pragma: "no-cache" } },
		);
	} catch (error) {
		if (error instanceof OauthTokenError) {
			return tokenError(error.error, error.message, error.error === "invalid_client" ? 401 : 400);
		}
		throw error;
	}
}

async function corsPreflightRoute() {
	return new NextResponse(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}

export const POST = appApiHandler({ POST: oauthTokenRoute });
export const OPTIONS = corsPreflightRoute;
