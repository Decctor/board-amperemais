import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { createIfoodClient, exchangeIfoodAuthorizationCode } from "@/lib/data-connectors/ifood";
import { connectDataSourceIntegration } from "@/lib/integrations/data-sources";
import { getIfoodMerchantsList } from "@/lib/integrations/ifood/merchant";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { db } from "@/services/drizzle";
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
	// Reconexão explícita (D9): id da linha de `integrations` a reativar.
	reconnectIntegrationId: z.string({ invalid_type_error: "Tipo inválido para o ID da conexão a reconectar." }).optional().nullable(),
});
export type TCompleteIfoodAuthorizationInput = z.infer<typeof CompleteIfoodAuthorizationInputSchema>;

async function completeIfoodAuthorization({
	input,
	organizationId,
	autorId,
	authorizationCodeVerifier,
}: {
	input: TCompleteIfoodAuthorizationInput;
	organizationId: string;
	autorId: string;
	authorizationCodeVerifier: string;
}) {
	const token = await exchangeIfoodAuthorizationCode({
		authorizationCode: input.authorizationCode,
		authorizationCodeVerifier,
	});

	// Descobre os merchants JÁ NA CONEXÃO: eles são a identidade externa da conta iFood — sem
	// eles o guard de duplicidade (D5) e a reconexão automática da mesma conta (D9) não têm o
	// que comparar, e autorizar a mesma conta duas vezes criaria duas linhas ativas. Falha na
	// descoberta não bloqueia a conexão (o resolver backfilla depois), só a deduplicação.
	let merchantIds: string[] = [];
	try {
		const merchants = await getIfoodMerchantsList(
			createIfoodClient({
				tipo: "IFOOD",
				merchantIds: [],
				accessToken: token.accessToken,
				refreshToken: token.refreshToken,
				tokenType: token.tokenType,
				scope: token.scope,
				expiresAt: token.expiresAt,
				aceiteAutomaticoPedidos: false,
			}),
		);
		merchantIds = merchants.map((merchant) => merchant.id);
	} catch (error) {
		console.warn("[IFOOD_AUTH_COMPLETE] Falha ao descobrir merchants na conexão — dedup indisponível até o backfill.", error);
	}

	const integrationConfig = {
		tipo: "IFOOD" as const,
		merchantIds,
		accessToken: token.accessToken,
		refreshToken: token.refreshToken,
		tokenType: token.tokenType,
		scope: token.scope,
		expiresAt: token.expiresAt,
		authorizedAt: new Date().toISOString(),
		// Conexão nova sempre nasce sem aceite automático — opt-in explícito nas configurações.
		aceiteAutomaticoPedidos: false,
	};

	const { integration } = await connectDataSourceIntegration({
		executor: db,
		organizationId,
		config: integrationConfig,
		autorId,
		reconnectIntegrationId: input.reconnectIntegrationId,
	});

	return {
		data: {
			integracaoTipo: "IFOOD" as const,
			integrationId: integration.id,
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
	if (!canManageIntegrations(session.membership?.permissoes)) {
		return NextResponse.json({ error: "Você não possui permissão para gerenciar integrações." }, { status: 403 });
	}

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
		autorId: session.user.id,
		authorizationCodeVerifier,
	});

	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: completeIfoodAuthorizationRoute,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
