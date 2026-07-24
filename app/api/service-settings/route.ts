import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveServiceSettings } from "@/lib/tabs";
import { ServiceSettingsConfigurationSchema } from "@/schemas/service-settings";
import { db } from "@/services/drizzle";
import { serviceSettings } from "@/services/drizzle/schema";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const UpdateServiceSettingsInputSchema = z.object({
	configuracoes: ServiceSettingsConfigurationSchema,
});
export type TUpdateServiceSettingsInput = z.infer<typeof UpdateServiceSettingsInputSchema>;

// ============================================================================
// SERVICES
// ============================================================================

async function getServiceSettings({ orgId }: { orgId: string }) {
	const configuracoes = await resolveServiceSettings({ orgId });
	return {
		data: { configuracoes },
		message: "Configuracao de atendimento carregada com sucesso.",
	};
}
export type TGetServiceSettingsOutput = Awaited<ReturnType<typeof getServiceSettings>>;

async function updateServiceSettings({ input, orgId }: { input: TUpdateServiceSettingsInput; orgId: string }) {
	await db
		.insert(serviceSettings)
		.values({ organizacaoId: orgId, configuracoes: input.configuracoes, dataAtualizacao: new Date() })
		.onConflictDoUpdate({
			target: serviceSettings.organizacaoId,
			set: { configuracoes: input.configuracoes, dataAtualizacao: new Date() },
		});

	return {
		data: { configuracoes: input.configuracoes },
		message: "Configuracao de atendimento atualizada com sucesso.",
	};
}
export type TUpdateServiceSettingsOutput = Awaited<ReturnType<typeof updateServiceSettings>>;

// ============================================================================
// HANDLERS
// ============================================================================

function getSessionWithERP(session: TAuthUserSession | null) {
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organizacao nao possui acesso ao modulo de ERP.");
	}
	return session;
}

async function getServiceSettingsRoute(_request: NextRequest) {
	const session = getSessionWithERP(await getCurrentSessionUncached());
	const result = await getServiceSettings({ orgId: session.membership!.organizacao.id });
	return NextResponse.json(result);
}

async function updateServiceSettingsRoute(request: NextRequest) {
	const session = getSessionWithERP(await getCurrentSessionUncached());
	const body = await request.json();
	const input = UpdateServiceSettingsInputSchema.parse(body);
	const result = await updateServiceSettings({ input, orgId: session.membership!.organizacao.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getServiceSettingsRoute });
export const PUT = appApiHandler({ PUT: updateServiceSettingsRoute });
