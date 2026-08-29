import { buildAuthorizationServerMetadata, OAUTH_CORS_HEADERS, resolveOauthIssuer } from "@/lib/access/oauth-metadata";
import { type NextRequest, NextResponse } from "next/server";

// RFC 8414: metadados do authorization server. O issuer é a própria aplicação — o AS mínimo
// vive aqui dentro até que a escala justifique um IdP dedicado.

export const dynamic = "force-dynamic";

async function authorizationServerMetadataRoute(request: NextRequest) {
	const issuer = resolveOauthIssuer(request);
	return NextResponse.json(buildAuthorizationServerMetadata(issuer), { headers: OAUTH_CORS_HEADERS });
}

async function corsPreflightRoute() {
	return new NextResponse(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}

export const GET = authorizationServerMetadataRoute;
export const OPTIONS = corsPreflightRoute;
