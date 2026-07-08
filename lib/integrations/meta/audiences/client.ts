import type { TMetaAdsIntegrationConfig } from "@/schemas/integrations";
import { metaGraphDelete, metaGraphPost } from "@/lib/integrations/meta/ads/client";

// Schema de identificadores enviados à Meta (ordem fixa; valores hasheados SHA-256).
export const CUSTOM_AUDIENCE_SCHEMA = ["EMAIL", "PHONE"] as const;

/** Uma linha de usuário no formato do payload da Meta: [emailHash, phoneHash] (vazio quando ausente). */
export type TCustomAudienceUserRow = [string, string];

type CreateCustomAudienceResponse = { id?: string };
type CustomAudienceUsersResponse = {
	audience_id?: string;
	num_received?: number;
	num_invalid_entries?: number;
	invalid_entry_samples?: unknown;
};

/** Cria uma Custom Audience (lista de clientes) na conta de anúncios. Retorna o id da audiência. */
export async function createCustomAudience({
	config,
	name,
	description,
}: {
	config: TMetaAdsIntegrationConfig;
	name: string;
	description?: string;
}): Promise<string> {
	const response = await metaGraphPost<CreateCustomAudienceResponse>(
		`/${config.adAccountId}/customaudiences`,
		{
			name,
			subtype: "CUSTOM",
			customer_file_source: "USER_PROVIDED_ONLY",
			...(description ? { description } : {}),
		},
		config.accessToken,
	);
	if (!response.id) throw new Error("A Meta não retornou o ID da Custom Audience.");
	return response.id;
}

/** Cria um público semelhante (Lookalike) a partir de uma Custom Audience seed. */
export async function createLookalikeAudience({
	config,
	originAudienceId,
	name,
	ratio = 0.01,
	country = "BR",
}: {
	config: TMetaAdsIntegrationConfig;
	originAudienceId: string;
	name: string;
	ratio?: number;
	country?: string;
}): Promise<string> {
	const response = await metaGraphPost<CreateCustomAudienceResponse>(
		`/${config.adAccountId}/customaudiences`,
		{
			name,
			subtype: "LOOKALIKE",
			origin_audience_id: originAudienceId,
			lookalike_spec: JSON.stringify({ type: "similarity", country, ratio }),
		},
		config.accessToken,
	);
	if (!response.id) throw new Error("A Meta não retornou o ID do público semelhante.");
	return response.id;
}

/** Adiciona usuários (hasheados) à Custom Audience. Envia em lotes de até `batchSize` linhas. */
export async function addUsersToCustomAudience({
	config,
	customAudienceId,
	rows,
	batchSize = 5000,
}: {
	config: TMetaAdsIntegrationConfig;
	customAudienceId: string;
	rows: TCustomAudienceUserRow[];
	batchSize?: number;
}): Promise<{ received: number }> {
	let received = 0;
	for (let index = 0; index < rows.length; index += batchSize) {
		const batch = rows.slice(index, index + batchSize);
		const response = await metaGraphPost<CustomAudienceUsersResponse>(
			`/${customAudienceId}/users`,
			{ payload: JSON.stringify({ schema: [...CUSTOM_AUDIENCE_SCHEMA], data: batch }) },
			config.accessToken,
		);
		received += response.num_received ?? batch.length;
	}
	return { received };
}

/** Remove usuários (hasheados) da Custom Audience — usado para clientes que saíram do segmento. */
export async function removeUsersFromCustomAudience({
	config,
	customAudienceId,
	rows,
	batchSize = 5000,
}: {
	config: TMetaAdsIntegrationConfig;
	customAudienceId: string;
	rows: TCustomAudienceUserRow[];
	batchSize?: number;
}): Promise<void> {
	for (let index = 0; index < rows.length; index += batchSize) {
		const batch = rows.slice(index, index + batchSize);
		await metaGraphDelete<CustomAudienceUsersResponse>(
			`/${customAudienceId}/users`,
			{ payload: JSON.stringify({ schema: [...CUSTOM_AUDIENCE_SCHEMA], data: batch }) },
			config.accessToken,
		);
	}
}
