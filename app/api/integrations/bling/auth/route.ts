import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getBlingRedirectUri } from "@/lib/data-connectors/bling/client";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { BLING_AUTHORIZATION_URL } from "@/lib/data-connectors/bling/types";
import { persistOAuthRedirect } from "@/lib/integrations/oauth-redirect";
import { generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

export const BLING_OAUTH_STATE_COOKIE_NAME = "bling_oauth_state";
export const BLING_OAUTH_REDIRECT_COOKIE_NAME = "bling_oauth_redirect";
// Reconexão explícita (D9): id da linha de `integrations` a reativar, carregado no fluxo OAuth.
export const BLING_OAUTH_RECONNECT_COOKIE_NAME = "bling_oauth_reconnect_integration";

const CreateBlingAuthorizationInputSchema = z.object({});
export type TCreateBlingAuthorizationInput = z.infer<typeof CreateBlingAuthorizationInputSchema>;

async function createBlingAuthorization(_input: TCreateBlingAuthorizationInput) {
	const clientId = process.env.BLING_CLIENT_ID;
	if (!clientId) throw new Error("BLING_CLIENT_ID não configurado.");

	const cookieStore = await cookies();
	const state = generateState();
	const url = new URL(BLING_AUTHORIZATION_URL);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", getBlingRedirectUri());
	url.searchParams.set("state", state);

	cookieStore.set(BLING_OAUTH_STATE_COOKIE_NAME, state, {
		secure: true,
		path: "/",
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: "lax",
	});

	return url;
}
export type TCreateBlingAuthorizationOutput = Awaited<ReturnType<typeof createBlingAuthorization>>;

async function createBlingAuthorizationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "Você não está autenticado." }, { status: 401 });
	if (!session.membership?.organizacao.id) return NextResponse.json({ error: "Você precisa estar vinculado a uma organização." }, { status: 400 });
	if (!canManageIntegrations(session.membership?.permissoes)) {
		return NextResponse.json({ error: "Você não possui permissão para gerenciar integrações." }, { status: 403 });
	}

	const cookieStore = await cookies();
	persistOAuthRedirect(cookieStore, BLING_OAUTH_REDIRECT_COOKIE_NAME, request.nextUrl.searchParams.get("redirectTo"));

	const reconnectIntegrationId = request.nextUrl.searchParams.get("reconnectIntegrationId");
	if (reconnectIntegrationId) {
		cookieStore.set(BLING_OAUTH_RECONNECT_COOKIE_NAME, reconnectIntegrationId, {
			secure: true,
			path: "/",
			httpOnly: true,
			maxAge: 60 * 10,
			sameSite: "lax",
		});
	}

	const input = CreateBlingAuthorizationInputSchema.parse({});
	const url = await createBlingAuthorization(input);
	return NextResponse.redirect(url);
}

export const GET = appApiHandler({
	GET: createBlingAuthorizationRoute,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
