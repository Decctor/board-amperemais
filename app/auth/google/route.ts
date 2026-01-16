import { GOOGLE_OAUTH_STATE_COOKIE_NAME, GOOGLE_OAUTH_VERIFIER_COOKIE_NAME, google } from "@/lib/authentication/oauth-providers";
import { geolocation } from "@vercel/functions";
import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
	const userRequestLocation = geolocation(request);
	console.log("REQUEST LOCATION", userRequestLocation);
	const cookieStore = await cookies();
	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	const url = await google.createAuthorizationURL(state, codeVerifier, [
		"openid",
		"profile",
		"email",
		"https://www.googleapis.com/auth/user.addresses.read",
	]);
	url.searchParams.set("access_type", "offline");
	url.searchParams.set("prompt", "consent");

	cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, state, {
		secure: true,
		path: "/",
		httpOnly: true,
		maxAge: 60 * 10,
	});

	cookieStore.set(GOOGLE_OAUTH_VERIFIER_COOKIE_NAME, codeVerifier, {
		secure: true,
		path: "/",
		httpOnly: true,
		maxAge: 60 * 10,
	});

	return Response.redirect(url);
}
