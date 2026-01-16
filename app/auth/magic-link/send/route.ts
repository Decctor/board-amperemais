import { randomBytes } from "node:crypto";
import { EmailTemplate, sendEmailWithResend } from "@/lib/email";
import { db } from "@/services/drizzle";
import { authMagicLinks } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, ne } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const userId = searchParams.get("userId");

	if (!userId || typeof userId !== "string") {
		const error = "Parâmetros inválidos.";
		return new Response(null, {
			status: 400,
			headers: {
				Location: `/magic-link/verify?error=${encodeURIComponent(error)}`,
			},
		});
	}

	const magicLink = await db.query.authMagicLinks.findFirst({
		where: (fields, { eq }) => eq(fields.usuarioId, userId),
		with: {
			usuario: {
				columns: {
					email: true,
				},
			},
		},
	});

	if (!magicLink) {
		const error = "Parâmetros inválidos.";
		return new Response(null, {
			status: 400,
			headers: {
				Location: `/magic-link/verify?error=${encodeURIComponent(error)}`,
			},
		});
	}
	if (!magicLink.usuario.email) {
		const error = "Usuário não possui email.";
		return new Response(null, {
			status: 400,
			headers: { Location: `/magic-link/verify?error=${encodeURIComponent(error)}` },
		});
	}

	const verificationToken = randomBytes(32).toString("hex");
	const verificationCode = Math.floor(100_000 + Math.random() * 900_000).toString(); // Gera código de 6 dígitos

	const verificationTokenExpiresInMinutes = 30;

	const insertAuthVerificationTokenResponse = await db
		.insert(authMagicLinks)
		.values({
			usuarioId: userId,
			token: verificationToken,
			codigo: verificationCode,
			dataInsercao: dayjs().toDate(),
			dataExpiracao: dayjs().add(verificationTokenExpiresInMinutes, "minute").toDate(),
		})
		.returning({ id: authMagicLinks.id });

	const insertedAuthVerificationTokenId = insertAuthVerificationTokenResponse[0].id;
	if (!insertedAuthVerificationTokenId) {
		const error = "Oops, um erro desconhecido ocorreu, tente novamente.";
		return new Response(null, {
			status: 400,
			headers: { Location: `/auth/signin?error=${encodeURIComponent(error)}` },
		});
	}

	const deleteAuthVerificationTokensResponse = await db
		.delete(authMagicLinks)
		.where(and(eq(authMagicLinks.usuarioId, userId), ne(authMagicLinks.id, insertedAuthVerificationTokenId)))
		.returning({ id: authMagicLinks.id });

	await sendEmailWithResend(magicLink.usuario.email, EmailTemplate.AuthMagicLink, {
		magicLink: `${process.env.NEXT_PUBLIC_URL}/auth/magic-link/verify/callback?token=${verificationToken}`,
		verificationCode,
		expiresInMinutes: verificationTokenExpiresInMinutes,
	});

	const deleteAuthVerificationTokensCount = deleteAuthVerificationTokensResponse.length;
	const detailsMsg = deleteAuthVerificationTokensCount > 0 ? "Um novo link de acesso foi enviado !" : null;
	const redirectUrl = `${process.env.NEXT_PUBLIC_URL}/auth/magic-link?id=${insertedAuthVerificationTokenId}${detailsMsg ? `&details=${encodeURIComponent(detailsMsg)}` : ""}`;
	return new Response(null, {
		status: 302,
		headers: {
			Location: redirectUrl,
		},
	});
}
