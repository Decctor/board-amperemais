import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { exchangeBlingAuthorizationCode } from "@/lib/data-connectors/bling/client";
import { connectDataSourceIntegration } from "@/lib/integrations/data-sources";
import { startHistoricalImport, changeImportJob } from "@/lib/integrations/import-jobs/service";
import { integrationImportJobs } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { consumeOAuthRedirect } from "@/lib/integrations/oauth-redirect";
import { db } from "@/services/drizzle";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

import { BLING_OAUTH_RECONNECT_COOKIE_NAME, BLING_OAUTH_REDIRECT_COOKIE_NAME } from "../route";

const BLING_OAUTH_STATE_COOKIE_NAME = "bling_oauth_state";

const CompleteBlingAuthorizationInputSchema = z.object({
	code: z
		.string({
			required_error: "Código de autorização do Bling não informado.",
			invalid_type_error: "Tipo inválido para o código de autorização do Bling.",
		})
		.trim()
		.min(1, "Código de autorização do Bling não informado."),
	state: z
		.string({
			required_error: "State de autorização do Bling não informado.",
			invalid_type_error: "Tipo inválido para o state de autorização do Bling.",
		})
		.trim()
		.min(1, "State de autorização do Bling não informado."),
});
export type TCompleteBlingAuthorizationInput = z.infer<typeof CompleteBlingAuthorizationInputSchema>;

async function completeBlingAuthorization({
	input,
	organizationId,
	autorId,
	reconnectIntegrationId,
}: {
	input: TCompleteBlingAuthorizationInput;
	organizationId: string;
	autorId: string;
	reconnectIntegrationId?: string | null;
}) {
	const integrationConfig = await exchangeBlingAuthorizationCode({ code: input.code });

	const { integration } = await connectDataSourceIntegration({
		executor: db,
		organizationId,
		config: integrationConfig,
		autorId,
		reconnectIntegrationId,
	});

	return {
		data: {
			integracaoTipo: "BLING" as const,
			integrationId: integration.id,
		},
		message: "Bling conectado com sucesso.",
	};
}
export type TCompleteBlingAuthorizationOutput = Awaited<ReturnType<typeof completeBlingAuthorization>>;

async function completeBlingAuthorizationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "Você precisa estar autenticado para conectar o Bling." }, { status: 401 });

	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) return NextResponse.json({ error: "Você precisa estar vinculado a uma organização para conectar o Bling." }, { status: 400 });
	if (!canManageIntegrations(session.membership?.permissoes)) {
		return NextResponse.json({ error: "Você não possui permissão para gerenciar integrações." }, { status: 403 });
	}

	const cookieStore = await cookies();
	const storedState = cookieStore.get(BLING_OAUTH_STATE_COOKIE_NAME)?.value ?? null;
	cookieStore.delete(BLING_OAUTH_STATE_COOKIE_NAME);
	const reconnectIntegrationId = cookieStore.get(BLING_OAUTH_RECONNECT_COOKIE_NAME)?.value ?? null;
	cookieStore.delete(BLING_OAUTH_RECONNECT_COOKIE_NAME);
	const redirectPath = consumeOAuthRedirect(cookieStore, BLING_OAUTH_REDIRECT_COOKIE_NAME, "/dashboard/settings?view=integration");

	const input = CompleteBlingAuthorizationInputSchema.parse({
		code: request.nextUrl.searchParams.get("code"),
		state: request.nextUrl.searchParams.get("state"),
	});

	if (!storedState || input.state !== storedState) {
		return NextResponse.json({ error: "State inválido para conexão com o Bling." }, { status: 400 });
	}

	try {
		const result = await completeBlingAuthorization({ input, organizationId, autorId: session.user.id, reconnectIntegrationId });
		try {
			const waiting = await db.query.integrationImportJobs.findFirst({ where: and(eq(integrationImportJobs.integracaoId, result.data.integrationId), eq(integrationImportJobs.organizacaoId, organizationId), eq(integrationImportJobs.estado, "AGUARDANDO_RECONEXAO")) });
			if (waiting) await changeImportJob({ id: waiting.id, organizationId, action: "retry" });
			else if (new URL(redirectPath, "https://local.invalid").pathname === "/onboarding") await startHistoricalImport({ integrationId: result.data.integrationId, organizationId, autorId: null, janelaDias: 90 });
		} catch (error) { console.error("[BLING_CALLBACK] Conectado, mas não foi possível iniciar o histórico.", error); }
		return NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL));
	} catch (error) {
		console.error("[BLING_CALLBACK] Não foi possível conectar ao Bling.", error);
		return NextResponse.json({ error: "Não foi possível conectar ao Bling." }, { status: 400 });
	}
}

export const GET = appApiHandler({
	GET: completeBlingAuthorizationRoute,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
