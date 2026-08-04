import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getChannelErpPolicy } from "@/lib/sales/fulfillment-channels";
import { getActiveDataSourceIntegrations } from "@/lib/integrations/data-sources";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

/**
 * Política de canal de integrações (fase 3 do plano iFood/fulfillment): quais efeitos de ERP as
 * vendas de canais gerenciados (ex.: iFood) geram na plataforma. Persistida em
 * `organizations.configuracao.preferencias.integracaoERP`.
 *
 * Cashback NÃO faz parte: continua governado por `cashbackPrograms.acumuloPermitirViaIntegracao`.
 */

const IntegrationErpPolicySchema = z.object({
	fulfillment: z.boolean({ invalid_type_error: "Tipo inválido para o atendimento de vendas de integração." }),
	estoque: z.boolean({ invalid_type_error: "Tipo inválido para a baixa de estoque de vendas de integração." }),
	financeiro: z.boolean({ invalid_type_error: "Tipo inválido para o financeiro de vendas de integração." }),
	fiscal: z.boolean({ invalid_type_error: "Tipo inválido para a emissão fiscal de vendas de integração." }),
});

const UpdateIntegrationSettingsInputSchema = z.object({
	integracaoERP: IntegrationErpPolicySchema,
});
export type TUpdateIntegrationSettingsInput = z.infer<typeof UpdateIntegrationSettingsInputSchema>;

async function getIntegrationSettings({ organizacaoId }: { organizacaoId: string }) {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizacaoId),
		columns: { id: true, configuracao: true },
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const activeDataSources = await getActiveDataSourceIntegrations({ executor: db, organizationId: organizacaoId });

	return {
		data: {
			integracoes: activeDataSources.map((integration) => ({ id: integration.id, tipo: integration.tipo, apelido: integration.apelido })),
			integracaoERP: getChannelErpPolicy(organization.configuracao),
		},
		message: "Configurações de integração carregadas com sucesso.",
	};
}
export type TGetIntegrationSettingsOutput = Awaited<ReturnType<typeof getIntegrationSettings>>;

async function updateIntegrationSettings({ input, organizacaoId }: { input: TUpdateIntegrationSettingsInput; organizacaoId: string }) {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizacaoId),
		columns: { id: true, configuracao: true },
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	// Merge preservando o restante da configuração da organização (jsonb).
	const nextConfiguration = {
		...organization.configuracao,
		preferencias: {
			...organization.configuracao.preferencias,
			integracaoERP: input.integracaoERP,
		},
	};

	await db.update(organizations).set({ configuracao: nextConfiguration }).where(eq(organizations.id, organizacaoId));

	return {
		data: { integracaoERP: input.integracaoERP },
		message: "Configurações de integração atualizadas com sucesso.",
	};
}
export type TUpdateIntegrationSettingsOutput = Awaited<ReturnType<typeof updateIntegrationSettings>>;

async function getIntegrationSettingsRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar as configurações de integração.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const result = await getIntegrationSettings({ organizacaoId });
	return NextResponse.json(result);
}

async function updateIntegrationSettingsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar as configurações de integração.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const body = await request.json();
	const input = UpdateIntegrationSettingsInputSchema.parse(body);
	const result = await updateIntegrationSettings({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIntegrationSettingsRoute });
export const PUT = appApiHandler({ PUT: updateIntegrationSettingsRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
