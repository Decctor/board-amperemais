import { appApiHandler } from "@/lib/app-api";
import { FacebookOAuth } from "@/lib/authentication/oauth";
import * as arctic from "arctic";
import { NextRequest, NextResponse } from "next/server";

async function getArcticWhatsappRoute(_req: NextRequest) {
	const state = arctic.generateState();
	const scopes = ["whatsapp_business_management", "whatsapp_business_messaging"];
	const url = FacebookOAuth.createAuthorizationURL(state, scopes);

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
