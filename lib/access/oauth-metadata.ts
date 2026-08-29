import type { NextRequest } from "next/server";
import { OAUTH_SUPPORTED_SCOPES } from "./oauth";

// Metadados de descoberta OAuth — RFC 9728 (protected resource) e RFC 8414 (authorization
// server). Puros e estáticos: nenhuma decisão de autorização acontece aqui, só endereçamento.

// O issuer canônico vem do env; a origem da requisição é fallback para preview/dev, onde o
// env pode não apontar para o host em uso.
export function resolveOauthIssuer(request: NextRequest) {
	return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : request.nextUrl.origin;
}

export function buildProtectedResourceMetadata(issuer: string) {
	return {
		resource: `${issuer}/api/mcp`,
		authorization_servers: [issuer],
		bearer_methods_supported: ["header"],
		scopes_supported: OAUTH_SUPPORTED_SCOPES,
		resource_name: "RecompraCRM MCP",
	};
}

export function buildAuthorizationServerMetadata(issuer: string) {
	return {
		issuer,
		authorization_endpoint: `${issuer}/oauth/authorize`,
		token_endpoint: `${issuer}/api/oauth/token`,
		registration_endpoint: `${issuer}/api/oauth/register`,
		response_types_supported: ["code"],
		grant_types_supported: ["authorization_code"],
		code_challenge_methods_supported: ["S256"],
		// Clientes públicos com PKCE: nenhum segredo de cliente é emitido hoje.
		token_endpoint_auth_methods_supported: ["none"],
		scopes_supported: OAUTH_SUPPORTED_SCOPES,
	};
}

// Descoberta e endpoints OAuth são consumidos por clientes de fora (inclusive rodando em
// navegador, como o MCP Inspector); CORS aberto é seguro porque nada aqui usa cookies.
export const OAUTH_CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
} as const;
