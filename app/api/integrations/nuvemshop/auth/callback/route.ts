import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { connectDataSourceIntegration } from "@/lib/integrations/data-sources";
import { consumeOAuthRedirect } from "@/lib/integrations/oauth-redirect";
import { db } from "@/services/drizzle";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { NUVEMSHOP_OAUTH_REDIRECT_COOKIE_NAME } from "../route";

const NUVEMSHOP_OAUTH_STATE_COOKIE_NAME = "nuvemshop_oauth_state";

type TNuvemshopTokenResponse = {
	access_token?: string;
	token_type?: string;
	scope?: string;
	user_id?: string;
	store_id?: string;
	error?: string;
	error_description?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "Você precisa estar autenticado para conectar a Nuvem Shop." }, { status: 401 });

	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) return NextResponse.json({ error: "Você precisa estar vinculado a uma organização para conectar a Nuvem Shop." }, { status: 400 });

	const cookieStore = await cookies();
	const code = request.nextUrl.searchParams.get("code");
	const state = request.nextUrl.searchParams.get("state");
	const storedState = cookieStore.get(NUVEMSHOP_OAUTH_STATE_COOKIE_NAME)?.value ?? null;

	cookieStore.delete(NUVEMSHOP_OAUTH_STATE_COOKIE_NAME);
	const redirectPath = consumeOAuthRedirect(cookieStore, NUVEMSHOP_OAUTH_REDIRECT_COOKIE_NAME, "/dashboard/settings?view=integration");

	if (!code || !state || !storedState || state !== storedState) {
		return NextResponse.json({ error: "Código ou state inválido para conexão com a Nuvem Shop." }, { status: 400 });
	}

	const clientId = process.env.NUVEMSHOP_CLIENT_ID;
	const clientSecret = process.env.NUVEMSHOP_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		return NextResponse.json({ error: "Credenciais da Nuvem Shop não configuradas." }, { status: 500 });
	}

	const tokenResponse = await fetch("https://www.tiendanube.com/apps/authorize/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "authorization_code",
			code,
		}),
	});

	const tokenData = (await tokenResponse.json()) as TNuvemshopTokenResponse;
	if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
		console.error("[ERROR] [NUVEMSHOP_CALLBACK] Falha ao trocar código por token:", tokenData);
		return NextResponse.json({ error: "Falha ao validar código de autorização da Nuvem Shop." }, { status: 400 });
	}

	const storeId = tokenData.user_id ?? tokenData.store_id;
	if (!storeId) {
		console.error("[ERROR] [NUVEMSHOP_CALLBACK] Resposta sem user_id/store_id:", tokenData);
		return NextResponse.json({ error: "A Nuvem Shop não retornou o ID da loja." }, { status: 400 });
	}

	// A identidade da conta é o storeId (refExterno): reconectar a mesma loja reativa a mesma
	// linha; outra loja cria outra conexão (D5/D9).
	try {
		await connectDataSourceIntegration({
			executor: db,
			organizationId: userOrgId,
			config: {
				tipo: "NUVEM-SHOP",
				storeId: Number(storeId),
				accessToken: tokenData.access_token,
				tokenType: "bearer",
				scope: tokenData.scope
					? tokenData.scope
							.split(",")
							.map((scope) => scope.trim())
							.filter(Boolean)
					: [],
			},
			autorId: session.user.id,
		});
	} catch (error) {
		console.error("[ERROR] [NUVEMSHOP_CALLBACK] Falha ao registrar a conexão:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível conectar a Nuvem Shop." }, { status: 400 });
	}

	return NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
