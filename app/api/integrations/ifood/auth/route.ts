import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { createIfoodUserCode } from "@/lib/data-connectors/ifood";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

export const IFOOD_AUTHORIZATION_CODE_VERIFIER_COOKIE_NAME = "ifood_authorization_code_verifier";

const CreateIfoodAuthorizationInputSchema = z.object({});
export type TCreateIfoodAuthorizationInput = z.infer<typeof CreateIfoodAuthorizationInputSchema>;

async function createIfoodAuthorization(_input: TCreateIfoodAuthorizationInput) {
	const userCodeResponse = await createIfoodUserCode();
	const cookieStore = await cookies();

	cookieStore.set(IFOOD_AUTHORIZATION_CODE_VERIFIER_COOKIE_NAME, userCodeResponse.authorizationCodeVerifier, {
		secure: true,
		path: "/",
		httpOnly: true,
		maxAge: userCodeResponse.expiresIn ?? 60 * 10,
		sameSite: "lax",
	});

	return {
		userCode: userCodeResponse.userCode,
		verificationUrl: userCodeResponse.verificationUrl,
		verificationUrlComplete: userCodeResponse.verificationUrlComplete,
		expiresIn: userCodeResponse.expiresIn ?? null,
	};
}
export type TCreateIfoodAuthorizationOutput = Awaited<ReturnType<typeof createIfoodAuthorization>>;

async function createIfoodAuthorizationRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "VocÃª nÃ£o estÃ¡ autenticado." }, { status: 401 });
	if (!session.membership?.organizacao.id) return NextResponse.json({ error: "VocÃª precisa estar vinculado a uma organizaÃ§Ã£o." }, { status: 400 });

	const input = CreateIfoodAuthorizationInputSchema.parse({});
	const result = await createIfoodAuthorization(input);
	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: createIfoodAuthorizationRoute,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
