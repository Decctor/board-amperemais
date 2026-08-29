import { buildProtectedResourceMetadata, OAUTH_CORS_HEADERS, resolveOauthIssuer } from "@/lib/access/oauth-metadata";
import { type NextRequest, NextResponse } from "next/server";

// Variante com path (RFC 9728 §3.1): clientes que derivam a URL dos metadados a partir do
// caminho do recurso (`/api/mcp`) buscam `/.well-known/oauth-protected-resource/api/mcp`.
// Mesmo documento da variante raiz.

export const dynamic = "force-dynamic";

async function protectedResourceMetadataRoute(request: NextRequest) {
	const issuer = resolveOauthIssuer(request);
	return NextResponse.json(buildProtectedResourceMetadata(issuer), { headers: OAUTH_CORS_HEADERS });
}

async function corsPreflightRoute() {
	return new NextResponse(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}

export const GET = protectedResourceMetadataRoute;
export const OPTIONS = corsPreflightRoute;
