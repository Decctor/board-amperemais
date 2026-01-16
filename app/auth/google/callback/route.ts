import {
	GOOGLE_OAUTH_STATE_COOKIE_NAME,
	GOOGLE_OAUTH_VERIFIER_COOKIE_NAME,
	type GoogleUserOpenIDConnect,
	google,
} from "@/lib/authentication/oauth-providers";
import { createSession, generateSessionToken, setSetSessionCookie } from "@/lib/authentication/session";
import { formatAsSlug } from "@/lib/formatting";
import { db } from "@/services/drizzle";
import { type TNewUserEntity, users } from "@/services/drizzle/schema";
import { geolocation } from "@vercel/functions";
import { OAuth2RequestError } from "arctic";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
	const userRequestLocation = geolocation(request);
	console.log("CALLBACK", userRequestLocation);
	const cookieStore = await cookies();

	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	const storedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value ?? null;
	const codeVerifier = cookieStore.get(GOOGLE_OAUTH_VERIFIER_COOKIE_NAME)?.value ?? null;

	if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
		console.log("[ERROR] [GOOGLE_CALLBACK] Error in code/state validation.");
		return new Response(null, {
			status: 400,
			headers: { Location: "/login" },
		});
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);

		// console.log("GOOGLE OAUTH TOKENS", tokens);
		const accessToken = tokens.accessToken();
		const refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : null;
		// console.log("GOOGLE OAUTH ACCESS TOKEN", accessToken);
		// console.log("GOOGLE OAUTH REFRESH TOKEN", refreshToken);
		const googleOpenIdConnectResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const googleUser: GoogleUserOpenIDConnect = await googleOpenIdConnectResponse.json();

		// console.log("GOOGLE USER", googleUser);

		if (!googleUser.email || !googleUser.email_verified) {
			console.log("[ERROR] [GOOGLE_CALLBACK] User email in Google is not defined or verified.");
			return new Response(
				JSON.stringify({
					error: "Sua conta precisa de um email verificado.",
				}),
				{ status: 400, headers: { Location: "/auth/signin" } },
			);
		}

		let clientId: string | null = null;

		const existingUser = await db.query.users.findFirst({
			where: (fields, { eq, or }) => or(eq(fields.email, googleUser.email), eq(fields.googleId, googleUser.sub)),
		});

		if (!existingUser) {
			console.log("[INFO] [GOOGLE_CALLBACK] User was not found. Creating new user with info:", {
				name: googleUser.name,
				email: googleUser.email,
				googleId: googleUser.sub,
				locationUf: userRequestLocation.countryRegion || null,
				locationCity: userRequestLocation.city?.toUpperCase() || null,
			});
			const newUser: TNewUserEntity = {
				nome: googleUser.name,
				email: googleUser.email,
				telefone: "",
				localizacaoEstado: userRequestLocation.countryRegion || null,
				localizacaoCidade: userRequestLocation.city?.toUpperCase() || null,
				avatarUrl: googleUser.picture || null,
				googleId: googleUser.sub,
				googleRefreshToken: refreshToken,
				googleAccessToken: accessToken,
				permissoes: {
					resultados: {
						visualizar: true,
						criarMetas: true,
						visualizarMetas: true,
						editarMetas: true,
						excluirMetas: true,
						escopo: [],
					},
					usuarios: { visualizar: true, criar: true, editar: true, excluir: true },
					atendimentos: { visualizar: true, iniciar: true, responder: true, finalizar: true },
				},
				senha: "",
				usuario: formatAsSlug(googleUser.name),
			};

			const insertUserResponse = await db.insert(users).values(newUser).returning({
				insertedId: users.id,
			});
			const insertedUserId = insertUserResponse[0]?.insertedId;

			if (!insertedUserId) {
				console.log("[ERROR] [GOOGLE_CALLBACK] User was not inserted.");
				return new Response(
					JSON.stringify({
						error: "Oops, um erro desconhecido ocorreu.",
					}),
					{ status: 400, headers: { Location: "/login" } },
				);
			}
			clientId = insertedUserId;
		} else {
			console.log(`[INFO] [GOOGLE_CALLBACK] User already exists. Updating info for user ${existingUser.id}`);
			clientId = existingUser.id;

			await db
				.update(users)
				.set({
					localizacaoEstado: existingUser.localizacaoEstado ? existingUser.localizacaoEstado : userRequestLocation.countryRegion || "",
					localizacaoCidade: existingUser.localizacaoCidade ? existingUser.localizacaoCidade : userRequestLocation.city?.toUpperCase() || "",
					email: existingUser.email || googleUser.email,
					avatarUrl: existingUser.avatarUrl || googleUser.picture,
					googleId: existingUser.googleId || googleUser.sub,
					googleRefreshToken: existingUser.googleRefreshToken || refreshToken,
				})
				.where(eq(users.id, existingUser.id));
		}

		const sessionToken = await generateSessionToken();
		const session = await createSession({
			token: sessionToken,
			userId: clientId,
		});
		setSetSessionCookie({
			token: sessionToken,
			expiresAt: session.dataExpiracao,
		});

		return new Response(null, {
			status: 302,
			headers: { Location: "/dashboard" },
		});
	} catch (error) {
		console.error("[ERROR] [GOOGLE_CALLBACK] Unidentified error:", error);

		// the specific error message depends on the provider
		if (error instanceof OAuth2RequestError) {
			// invalid code
			return new Response(JSON.stringify({ error: "Código inválido." }), {
				status: 400,
			});
		}

		return new Response(JSON.stringify({ error: "Oops, um erro desconhecido ocorreu." }), {
			status: 500,
		});
	}
}
