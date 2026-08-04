/**
 * SANDBOX ONLY — Conexão iFood via app centralizado de teste (client_credentials).
 * Remover esta rota quando não precisar mais do fluxo sandbox.
 */
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { buildIfoodSandboxIntegrationConfig, isIfoodSandboxEnabled } from "@/lib/data-connectors/ifood/sandbox";
import { connectDataSourceIntegration } from "@/lib/integrations/data-sources";
import { db } from "@/services/drizzle";
import { NextResponse, type NextRequest } from "next/server";

async function connectIfoodSandbox({ organizationId, autorId }: { organizationId: string; autorId: string }) {
	const integrationConfig = await buildIfoodSandboxIntegrationConfig();

	const { integration } = await connectDataSourceIntegration({
		executor: db,
		organizationId,
		config: integrationConfig,
		autorId,
	});

	return {
		data: {
			integracaoTipo: "IFOOD" as const,
			integrationId: integration.id,
			merchantIds: integrationConfig.merchantIds,
		},
		message: "Integração iFood sandbox conectada com sucesso.",
	};
}
export type TConnectIfoodSandboxOutput = Awaited<ReturnType<typeof connectIfoodSandbox>>;

async function connectIfoodSandboxRoute(_request: NextRequest) {
	if (!isIfoodSandboxEnabled()) {
		return NextResponse.json({ error: "Integração iFood sandbox desabilitada." }, { status: 404 });
	}

	const session = await getCurrentSessionUncached();
	if (!session) return NextResponse.json({ error: "Você precisa estar autenticado para conectar o iFood sandbox." }, { status: 401 });

	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) {
		return NextResponse.json({ error: "Você precisa estar vinculado a uma organização para conectar o iFood sandbox." }, { status: 400 });
	}

	const result = await connectIfoodSandbox({ organizationId, autorId: session.user.id });

	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: connectIfoodSandboxRoute,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
