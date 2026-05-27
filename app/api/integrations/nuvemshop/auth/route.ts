import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const NUVEMSHOP_OAUTH_STATE_COOKIE_NAME = "nuvemshop_oauth_state";

export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "Você não está autenticado." }, { status: 401 });
	if (!session.membership?.organizacao.id) return NextResponse.json({ error: "Você precisa estar vinculado a uma organização." }, { status: 400 });

	const clientId = process.env.NUVEMSHOP_CLIENT_ID;
	if (!clientId) return NextResponse.json({ error: "NUVEMSHOP_CLIENT_ID não configurado." }, { status: 500 });

	const cookieStore = await cookies();
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
