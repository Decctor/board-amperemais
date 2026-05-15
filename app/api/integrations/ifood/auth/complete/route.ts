import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { exchangeIfoodAuthorizationCode } from "@/lib/data-connectors/ifood";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

const IFOOD_AUTHORIZATION_CODE_VERIFIER_COOKIE_NAME = "ifood_authorization_code_verifier";

const CompleteIfoodAuthorizationInputSchema = z.object({
	authorizationCode: z
		.string({
			required_error: "Código de autorização do iFood não informado.",
			invalid_type_error: "Tipo inválido para o código de autorização do iFood.",
		})
		.trim()
		.min(1, "Código de autorização do iFood não informado."),
});
export type TCompleteIfoodAuthorizationInput = z.infer<typeof CompleteIfoodAuthorizationInputSchema>;

async function completeIfoodAuthorization({
	input,
	organizationId,
	authorizationCodeVerifier,
}: {
	input: TCompleteIfoodAuthorizationInput;
	organizationId: string;
	authorizationCodeVerifier: string;
}) {
	const token = await exchangeIfoodAuthorizationCode({
		authorizationCode: input.authorizationCode,
		authorizationCodeVerifier,
	});

	const integrationConfig = {
		tipo: "IFOOD" as const,
		merchantIds: [],
		accessToken: token.accessToken,
		refreshToken: token.refreshToken,
		tokenType: token.tokenType,
		scope: token.scope,
		expiresAt: token.expiresAt,
		authorizedAt: new Date().toISOString(),
	};

	await db
		.update(organizations)
		.set({
			integracaoTipo: "IFOOD",
			integracaoConfiguracao: integrationConfig,
			integracaoDataUltimaSincronizacao: null,
			dadosViaIntegracoes: true,
		})
		.where(eq(organizations.id, organizationId));

	return {
		data: {
			integracaoTipo: "IFOOD" as const,
		},
		message: "Integração iFood conectada com sucesso.",
	};
}
export type TCompleteIfoodAuthorizationOutput = Awaited<ReturnType<typeof completeIfoodAuthorization>>;

async function completeIfoodAuthorizationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "Você precisa estar autenticado para conectar o iFood." }, { status: 401 });

	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) return NextResponse.json({ error: "Você precisa estar vinculado a uma organização para conectar o iFood." }, { status: 400 });

	const payload = await request.json();
	const input = CompleteIfoodAuthorizationInputSchema.parse(payload);
	const cookieStore = await cookies();
	const authorizationCodeVerifier = cookieStore.get(IFOOD_AUTHORIZATION_CODE_VERIFIER_COOKIE_NAME)?.value;
	cookieStore.delete(IFOOD_AUTHORIZATION_CODE_VERIFIER_COOKIE_NAME);

	if (!authorizationCodeVerifier) {
		return NextResponse.json({ error: "Sessão de autorização do iFood expirada. Gere um novo código." }, { status: 400 });
	}

	const result = await completeIfoodAuthorization({
		input,
		organizationId,
		authorizationCodeVerifier,
	});

	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: completeIfoodAuthorizationRoute,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
