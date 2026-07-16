import { createIfoodClient, getValidIfoodConfig } from "@/lib/data-connectors/ifood/client";
import { IfoodConfigSchema, type TIfoodConfig } from "@/lib/data-connectors/ifood/types";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import type { AxiosInstance } from "axios";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { getIfoodMerchantsList } from "./merchant";
import type { TIfoodMerchantSummaryDTO } from "./merchant-types";

export type TIfoodManagementContext = {
	config: TIfoodConfig;
	client: AxiosInstance;
	merchantIds: string[];
	/** Preenchido apenas quando a lista precisou ser buscada no iFood (merchantIds vazio na config). */
	merchants: TIfoodMerchantSummaryDTO[] | null;
};

/**
 * Resolve o contexto de GESTÃO do iFood de uma organização: lê a config da org, valida a conexão,
 * garante token válido (auto-refresh via `getValidIfoodConfig`) e retorna o client autenticado.
 *
 * - Se `merchantId` for informado, valida que ele pertence à organização (isolamento multi-tenant).
 * - Se a config ainda não tiver `merchantIds`, busca no iFood e persiste na config da org (o
 *   polling de eventos também depende dessa lista).
 *
 * Lança 404 quando a organização não tem iFood conectado — a UI usa essa resposta para exibir o
 * gate de conexão.
 */
export async function resolveIfoodManagementContext({
	organizacaoId,
	merchantId,
}: {
	organizacaoId: string;
	merchantId?: string | null;
}): Promise<TIfoodManagementContext> {
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizacaoId),
		columns: { id: true, integracaoTipo: true, integracaoConfiguracao: true },
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	if (organization.integracaoTipo !== "IFOOD" || organization.integracaoConfiguracao?.tipo !== "IFOOD") {
		throw new createHttpError.NotFound("Integração do iFood não encontrada. Conecte sua loja iFood para gerenciar seus recursos.");
	}

	const parsedConfig = IfoodConfigSchema.safeParse(organization.integracaoConfiguracao);
	if (!parsedConfig.success) {
		throw new createHttpError.NotFound("Configuração do iFood inválida. Reconecte sua loja iFood.");
	}

	const config = await getValidIfoodConfig({ organizationId: organizacaoId, config: parsedConfig.data });
	const client = createIfoodClient(config);

	let merchantIds = config.merchantIds;
	let merchants: TIfoodMerchantSummaryDTO[] | null = null;
	if (!merchantIds.length) {
		merchants = await getIfoodMerchantsList(client);
		merchantIds = merchants.map((merchant) => merchant.id);
		if (merchantIds.length) {
			await db
				.update(organizations)
				.set({ integracaoConfiguracao: { ...config, merchantIds } })
				.where(eq(organizations.id, organizacaoId));
		}
	}

	if (merchantId && !merchantIds.includes(merchantId)) {
		throw new createHttpError.NotFound("Loja do iFood não encontrada para esta organização.");
	}

	return { config: { ...config, merchantIds }, client, merchantIds, merchants };
}
