import type { TMetaAdsIntegrationConfig } from "@/schemas/integrations";
import { db } from "@/services/drizzle";
import { integrations } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

export type TResolvedMetaAdsIntegration = {
	integrationId: string;
	config: TMetaAdsIntegrationConfig;
};

/**
 * Resolve uma integração META_ADS de uma organização e retorna sua config (com token). Se
 * `integrationId` for informado, busca aquela conexão específica; senão, a primeira META_ADS ativa.
 * Sempre escopado por `organizacaoId` (isolamento multi-tenant). Lança 404 se não houver.
 */
export async function resolveMetaAdsIntegration({
	organizacaoId,
	integrationId,
}: {
	organizacaoId: string;
	integrationId?: string | null;
}): Promise<TResolvedMetaAdsIntegration> {
	const row = integrationId
		? await db.query.integrations.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.id, integrationId), eq(fields.organizacaoId, organizacaoId), eq(fields.tipo, "META_ADS")),
			})
		: await db.query.integrations.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizacaoId), eq(fields.tipo, "META_ADS"), eq(fields.ativo, true)),
			});

	if (!row || row.configuracao?.tipo !== "META_ADS") {
		throw new createHttpError.NotFound("Integração do Meta Ads não encontrada. Conecte uma conta de anúncios.");
	}
	return { integrationId: row.id, config: row.configuracao };
}

/** Marca o resultado de um acesso à Meta na linha da integração (status/erro/última sincronização). */
export async function markMetaAdsIntegrationStatus({
	integrationId,
	status,
	erro,
}: {
	integrationId: string;
	status: "CONECTADO" | "EXPIRADO" | "ERRO";
	erro?: string | null;
}) {
	await db
		.update(integrations)
		.set({ status, ultimoErro: erro ?? null, dataUltimaSincronizacao: new Date() })
		.where(and(eq(integrations.id, integrationId), eq(integrations.tipo, "META_ADS")));
}
