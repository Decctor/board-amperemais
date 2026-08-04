import { createIfoodClient, getValidIfoodConfig } from "@/lib/data-connectors/ifood/client";
import { IfoodConfigSchema, type TIfoodConfig } from "@/lib/data-connectors/ifood/types";
import { getActiveDataSourceIntegrations, type TDataSourceIntegration } from "@/lib/integrations/data-sources";
import { db } from "@/services/drizzle";
import { integrations } from "@/services/drizzle/schema";
import type { AxiosInstance } from "axios";
import { eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { getIfoodMerchantsList } from "./merchant";
import type { TIfoodMerchantSummaryDTO } from "./merchant-types";

export type TIfoodManagementContext = {
	/** Linha de `integrations` da conexão resolvida — repasse para operações subsequentes. */
	integrationId: string;
	config: TIfoodConfig;
	client: AxiosInstance;
	merchantIds: string[];
	/** Preenchido apenas quando a lista precisou ser buscada no iFood (merchantIds vazio na config). */
	merchants: TIfoodMerchantSummaryDTO[] | null;
};

function pickIfoodIntegration({
	rows,
	merchantId,
	integrationId,
}: {
	rows: TDataSourceIntegration[];
	merchantId?: string | null;
	integrationId?: string | null;
}): TDataSourceIntegration {
	if (integrationId) {
		const row = rows.find((candidate) => candidate.id === integrationId);
		if (!row) throw new createHttpError.NotFound("Conexão do iFood não encontrada para esta organização.");
		return row;
	}
	if (rows.length === 1) return rows[0];
	if (merchantId) {
		// O guard de identidade (D5) impede merchantIds sobrepostos entre linhas ativas — o
		// merchant identifica a conexão sem ambiguidade.
		const row = rows.find((candidate) => candidate.configuracao.tipo === "IFOOD" && candidate.configuracao.merchantIds.includes(merchantId));
		if (!row) throw new createHttpError.NotFound("Loja do iFood não encontrada para esta organização.");
		return row;
	}
	throw new createHttpError.Conflict("Organização possui mais de uma conexão iFood ativa. Informe a loja (merchantId) ou a conexão (integrationId).");
}

/**
 * Resolve o contexto de GESTÃO do iFood de uma organização: encontra a linha IFOOD ativa em
 * `integrations`, valida a conexão, garante token válido (auto-refresh row-scoped via
 * `getValidIfoodConfig`) e retorna o client autenticado.
 *
 * - Com N conexões iFood ativas, a linha é escolhida por `integrationId` explícito ou pelo
 *   `merchantId` (que pertence a exatamente uma conexão — guard D5); sem nenhum dos dois e com
 *   mais de uma linha, o resolver falha com 409 em vez de escolher silenciosamente.
 * - Se `merchantId` for informado, valida que ele pertence à conexão (isolamento multi-tenant).
 * - Se a config ainda não tiver `merchantIds`, busca no iFood e persiste NA LINHA da conexão (o
 *   polling de eventos também depende dessa lista).
 *
 * Lança 404 quando a organização não tem iFood conectado — a UI usa essa resposta para exibir o
 * gate de conexão.
 */
export async function resolveIfoodManagementContext({
	organizacaoId,
	merchantId,
	integrationId,
}: {
	organizacaoId: string;
	merchantId?: string | null;
	integrationId?: string | null;
}): Promise<TIfoodManagementContext> {
	const rows = await getActiveDataSourceIntegrations({ executor: db, organizationId: organizacaoId, types: ["IFOOD"] });
	if (!rows.length) {
		throw new createHttpError.NotFound("Integração do iFood não encontrada. Conecte sua loja iFood para gerenciar seus recursos.");
	}

	const integration = pickIfoodIntegration({ rows, merchantId, integrationId });

	const parsedConfig = IfoodConfigSchema.safeParse(integration.configuracao);
	if (!parsedConfig.success) {
		throw new createHttpError.NotFound("Configuração do iFood inválida. Reconecte sua loja iFood.");
	}

	const config = await getValidIfoodConfig({ integrationId: integration.id, config: parsedConfig.data });
	const client = createIfoodClient(config);

	let merchantIds = config.merchantIds;
	let merchants: TIfoodMerchantSummaryDTO[] | null = null;
	if (!merchantIds.length) {
		merchants = await getIfoodMerchantsList(client);
		merchantIds = merchants.map((merchant) => merchant.id);
		if (merchantIds.length) {
			// Patch cirúrgico só de merchantIds (jsonb_set): um refresh de token concorrente não é
			// sobrescrito por este snapshot da config.
			await db
				.update(integrations)
				.set({
					configuracao: sql`jsonb_set(${integrations.configuracao}, '{merchantIds}', ${JSON.stringify(merchantIds)}::jsonb)`,
				})
				.where(eq(integrations.id, integration.id));

			// Merchants descobertos tarde demais para o guard de conexão (D5): se colidirem com
			// outra linha ativa, a conta foi conectada duas vezes — estado inválido a corrigir
			// manualmente (desativar uma das linhas). Não desativamos automaticamente.
			const discoveredSet = new Set(merchantIds);
			const overlapping = rows.find(
				(row) =>
					row.id !== integration.id && row.configuracao.tipo === "IFOOD" && row.configuracao.merchantIds.some((id) => discoveredSet.has(id)),
			);
			if (overlapping) {
				console.warn("[IFOOD_CONTEXT] Merchants descobertos colidem com outra conexão ativa da organização — mesma conta conectada duas vezes?", {
					organizacaoId,
					integrationId: integration.id,
					overlappingIntegrationId: overlapping.id,
				});
			}
		}
	}

	if (merchantId && !merchantIds.includes(merchantId)) {
		throw new createHttpError.NotFound("Loja do iFood não encontrada para esta organização.");
	}

	return { integrationId: integration.id, config: { ...config, merchantIds }, client, merchantIds, merchants };
}
