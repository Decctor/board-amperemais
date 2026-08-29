import { buildProtectedResourceMetadata, OAUTH_CORS_HEADERS, resolveOauthIssuer } from "@/lib/access/oauth-metadata";
import { type NextRequest, NextResponse } from "next/server";

// RFC 9728: metadados do resource server MCP. É o documento apontado pelo `WWW-Authenticate`
// do endpoint /api/mcp — e a indireção que um dia permite trocar o authorization server sem
// quebrar clientes.

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
