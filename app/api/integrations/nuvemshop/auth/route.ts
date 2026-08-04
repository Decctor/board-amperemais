import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { persistOAuthRedirect } from "@/lib/integrations/oauth-redirect";
import { generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const NUVEMSHOP_OAUTH_STATE_COOKIE_NAME = "nuvemshop_oauth_state";
export const NUVEMSHOP_OAUTH_REDIRECT_COOKIE_NAME = "nuvemshop_oauth_redirect";

export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "Você não está autenticado." }, { status: 401 });
	if (!session.membership?.organizacao.id) return NextResponse.json({ error: "Você precisa estar vinculado a uma organização." }, { status: 400 });
	if (!canManageIntegrations(session.membership?.permissoes)) {
		return NextResponse.json({ error: "Você não possui permissão para gerenciar integrações." }, { status: 403 });
	}

	const clientId = process.env.NUVEMSHOP_CLIENT_ID;
	if (!clientId) return NextResponse.json({ error: "NUVEMSHOP_CLIENT_ID não configurado." }, { status: 500 });

	const cookieStore = await cookies();
	persistOAuthRedirect(cookieStore, NUVEMSHOP_OAUTH_REDIRECT_COOKIE_NAME, request.nextUrl.searchParams.get("redirectTo"));

	const state = generateState();
	const url = new URL(`https://www.nuvemshop.com.br/apps/${clientId}/authorize`);
	url.searchParams.set("state", state);

	cookieStore.set(NUVEMSHOP_OAUTH_STATE_COOKIE_NAME, state, {
		secure: true,
		path: "/",
		httpOnly: true,
		maxAge: 60 * 10,
	});

	return NextResponse.redirect(url);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
