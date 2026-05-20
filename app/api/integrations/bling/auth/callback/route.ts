import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { exchangeBlingAuthorizationCode } from "@/lib/data-connectors/bling/client";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

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

async function completeBlingAuthorization({ input, organizationId }: { input: TCompleteBlingAuthorizationInput; organizationId: string }) {
	const integrationConfig = await exchangeBlingAuthorizationCode({ code: input.code });

	await db
		.update(organizations)
		.set({
			integracaoTipo: "BLING",
			integracaoConfiguracao: integrationConfig,
			integracaoDataUltimaSincronizacao: null,
			dadosViaIntegracoes: true,
		})
		.where(eq(organizations.id, organizationId));

	return {
		data: {
			integracaoTipo: "BLING" as const,
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

	const cookieStore = await cookies();
	const storedState = cookieStore.get(BLING_OAUTH_STATE_COOKIE_NAME)?.value ?? null;
	cookieStore.delete(BLING_OAUTH_STATE_COOKIE_NAME);

	const input = CompleteBlingAuthorizationInputSchema.parse({
		code: request.nextUrl.searchParams.get("code"),
		state: request.nextUrl.searchParams.get("state"),
	});

	if (!storedState || input.state !== storedState) {
		return NextResponse.json({ error: "State inválido para conexão com o Bling." }, { status: 400 });
	}

	try {
		await completeBlingAuthorization({ input, organizationId });
		return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?view=integration`));
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
