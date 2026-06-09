import { appApiHandler } from "@/lib/app-api";
import { FacebookOAuth } from "@/lib/authentication/oauth";
import { persistOAuthRedirect } from "@/lib/integrations/oauth-redirect";
import * as arctic from "arctic";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const WHATSAPP_OAUTH_REDIRECT_COOKIE_NAME = "whatsapp_oauth_redirect";

async function getArcticWhatsappRoute(req: NextRequest) {
	const cookieStore = await cookies();
	persistOAuthRedirect(cookieStore, WHATSAPP_OAUTH_REDIRECT_COOKIE_NAME, req.nextUrl.searchParams.get("redirectTo"));

	const state = arctic.generateState();
	const scopes = ["whatsapp_business_management", "whatsapp_business_messaging"];
	let url = FacebookOAuth.createAuthorizationURL(state, scopes);

	url.searchParams.set("config_id", process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID as string);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("override_default_response_type", "true");
	url.searchParams.set(
		"extras",
		JSON.stringify({
			setup: {},
			featureType: "whatsapp_business_app_onboarding",
			sessionInfoVersion: "3",
		}),
	);
	// OAuth puro — sem config_id, sem extras do Embedded Signup
	const finalUrl = url.toString().replace("v16.0", "v25.0");
	console.log("[INFO] [ARCTIC_WHATSAPP] Redirecting to:", finalUrl);
	return NextResponse.redirect(finalUrl);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = appApiHandler({
	GET: getArcticWhatsappRoute,
});
