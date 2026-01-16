import { createSession, generateSessionToken, setSetSessionCookie } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { authMagicLinks } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const token = searchParams.get("token");

	if (!token || typeof token !== "string") {
		const error = "Token inválido.";
		return new Response(null, {
			status: 400,
			headers: {
				Location: `/auth/magic-link?error=${encodeURIComponent(error)}`,
			},
		});
	}

	console.log("[INFO] [AUTH MAGIC LINK CALLBACK] Code received:", token);

	const authVerificationToken = await db.query.authMagicLinks.findFirst({
		where: (fields, { eq }) => eq(fields.token, token),
		with: {
			usuario: {
				columns: {
					id: true,
				},
			},
		},
	});
	if (!authVerificationToken) {
		console.log("[ERROR] [AUTH MAGIC LINK CALLBACK] No auth verification token found");
		const error = "Token inválido.";
		return new Response(null, {
			status: 400,
			headers: {
				Location: `/auth/magic-link?error=${encodeURIComponent(error)}`,
			},
		});
	}
	console.log("[INFO] [AUTH MAGIC LINK CALLBACK] Auth verification token found:", authVerificationToken);

	if (!authVerificationToken.usuario) {
		console.log("[ERROR] [AUTH MAGIC LINK CALLBACK] User not found");
		const error = "Token inválido.";
		return new Response(null, {
			status: 400,
			headers: {
				Location: `/auth/magic-link?error=${encodeURIComponent(error)}`,
			},
		});
	}

	console.log("[INFO] [AUTH MAGIC LINK CALLBACK] User found:", authVerificationToken.usuario);
	// Deleting used magic link
	await db.delete(authMagicLinks).where(eq(authMagicLinks.id, authVerificationToken.id));

	console.log("[INFO] [AUTH MAGIC LINK CALLBACK] Magic link validation passed.");
	// In case the opportunity creation succedded, redirecting the user
	const sessionToken = await generateSessionToken();
	const session = await createSession({
		token: sessionToken,
		userId: authVerificationToken.usuarioId,
	});
	console.log("SESSION CREATED", session);
	try {
		setSetSessionCookie({
			token: sessionToken,
			expiresAt: session.dataExpiracao,
		});
	} catch (error) {
		console.log("ERROR", error);
		const errorMsg = "Um erro desconhecido ocorreu.";
		return new Response(null, {
			status: 400,
			headers: {
				Location: `/auth/magic-link?error=${encodeURIComponent(errorMsg)}`,
			},
		});
	}

	console.log("SESSION SET");
	return redirect("/dashboard");
}
