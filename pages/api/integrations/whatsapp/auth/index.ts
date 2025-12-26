import { apiHandler } from "@/lib/api";
import { FacebookOAuth } from "@/lib/authentication/oauth";
import * as arctic from "arctic";
import type { NextApiHandler } from "next";

const handleArcticWhatsapp: NextApiHandler<any> = async (req, res) => {
	const state = arctic.generateState();
	const scopes = ["email", "public_profile", "whatsapp_business_management", "whatsapp_business_messaging"];
	const url = FacebookOAuth.createAuthorizationURL(state, scopes);
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
	const finalUrl = url.toString().replace("v16.0", "v21.0");
	console.log("[INFO] [ARCTIC_WHATSAPP] Redirecting to:", finalUrl);
	res.redirect(finalUrl);
};

export default apiHandler({
	GET: handleArcticWhatsapp,
});
