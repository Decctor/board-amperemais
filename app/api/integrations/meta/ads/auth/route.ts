import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { META_ADS_SCOPES, META_GRAPH_API_VERSION } from "@/lib/integrations/meta/ads/types";
import { persistOAuthRedirect } from "@/lib/integrations/oauth-redirect";
import { generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const META_ADS_OAUTH_STATE_COOKIE_NAME = "meta_ads_oauth_state";
export const META_ADS_OAUTH_REDIRECT_COOKIE_NAME = "meta_ads_oauth_redirect";

function getMetaAdsRedirectUri() {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL não configurado.");
	return new URL("/api/integrations/meta/ads/auth/callback", appUrl).href;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "Você não está autenticado." }, { status: 401 });
	if (!session.membership?.organizacao.id) return NextResponse.json({ error: "Você precisa estar vinculado a uma organização." }, { status: 400 });
	if (!canManageIntegrations(session.membership?.permissoes)) {
		return NextResponse.json({ error: "Você não possui permissão para gerenciar integrações." }, { status: 403 });
	}

	const clientId = process.env.NEXT_PUBLIC_META_APP_ID;
	if (!clientId) return NextResponse.json({ error: "NEXT_PUBLIC_META_APP_ID não configurado." }, { status: 500 });

	const cookieStore = await cookies();
	persistOAuthRedirect(cookieStore, META_ADS_OAUTH_REDIRECT_COOKIE_NAME, request.nextUrl.searchParams.get("redirectTo"));

	const state = generateState();
	const url = new URL(`https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth`);
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", getMetaAdsRedirectUri());
	url.searchParams.set("state", state);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", META_ADS_SCOPES.join(","));

	cookieStore.set(META_ADS_OAUTH_STATE_COOKIE_NAME, state, {
		secure: process.env.NODE_ENV === "production",
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		maxAge: 60 * 10,
	});

	return NextResponse.redirect(url);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
