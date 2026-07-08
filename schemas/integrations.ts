import { z } from "zod";

/**
 * Fundação de integrations (marketing/parceiros).
 *
 * Cada linha de `integrations` guarda uma conexão concreta com uma plataforma externa. O campo
 * `configuracao` (jsonb) é uma união discriminada por `tipo` — um schema por tipo de integração.
 * O `tipo` da configuração espelha a coluna `tipo` da linha (mantidos em sincronia pelo serviço).
 *
 * Segredos (tokens) NUNCA voltam crus ao cliente: as respostas de API passam por `maskConfig`
 * (`@/lib/integrations/mask`).
 */

export const MetaAdsIntegrationConfigSchema = z.object({
	tipo: z.literal("META_ADS"),
	accessToken: z.string({
		required_error: "Token de acesso do Meta Ads não informado.",
		invalid_type_error: "Tipo não válido para o token de acesso do Meta Ads.",
	}),
	tokenExpiresAt: z
		.string({ invalid_type_error: "Tipo não válido para a expiração do token do Meta Ads." })
		.datetime({ message: "Formato inválido para a expiração do token do Meta Ads." })
		.nullable(),
	metaUserId: z.string({
		required_error: "ID do usuário Meta não informado.",
		invalid_type_error: "Tipo não válido para o ID do usuário Meta.",
	}),
	adAccountId: z
		.string({
			required_error: "ID da conta de anúncios não informado.",
			invalid_type_error: "Tipo não válido para o ID da conta de anúncios.",
		})
		.regex(/^act_\d+$/, { message: "ID da conta de anúncios deve estar no formato act_<id>." }),
	adAccountNumericId: z.string({
		required_error: "ID numérico da conta de anúncios não informado.",
		invalid_type_error: "Tipo não válido para o ID numérico da conta de anúncios.",
	}),
	adAccountName: z.string({
		required_error: "Nome da conta de anúncios não informado.",
		invalid_type_error: "Tipo não válido para o nome da conta de anúncios.",
	}),
	currency: z.string({ invalid_type_error: "Tipo não válido para a moeda da conta de anúncios." }).optional(),
	timezoneName: z.string({ invalid_type_error: "Tipo não válido para o fuso horário da conta de anúncios." }).optional(),
	businessId: z.string({ invalid_type_error: "Tipo não válido para o ID do negócio Meta." }).optional(),
	businessName: z.string({ invalid_type_error: "Tipo não válido para o nome do negócio Meta." }).optional(),
	scopes: z.array(
		z.string({
			required_error: "Escopo do Meta Ads não informado.",
			invalid_type_error: "Tipo não válido para o escopo do Meta Ads.",
		}),
	),

	// Conversions API / Custom Audiences — preenchidos após a conexão base (Fase 2/3).
	// O Pixel/Dataset e o test event code do Events Manager vivem aqui (mesma conta de Ads).
	pixelId: z.string({ invalid_type_error: "Tipo não válido para o ID do Pixel." }).optional(),
	capiDatasetId: z.string({ invalid_type_error: "Tipo não válido para o ID do dataset do CAPI." }).optional(),
	capiTestEventCode: z.string({ invalid_type_error: "Tipo não válido para o código de teste do CAPI." }).optional(),
	// Chaves de evento (minúsculas) que disparam envio server-side ao CAPI (ex.: ["purchase"]).
	eventosCapi: z.array(z.string({ invalid_type_error: "Tipo não válido para evento do CAPI." })).optional(),
});
export type TMetaAdsIntegrationConfig = z.infer<typeof MetaAdsIntegrationConfigSchema>;

/**
 * Subconjunto editável da config Meta Ads (settings de CAPI). Tudo opcional — o PATCH aplica só o
 * que veio. Não permite mexer em token/adAccount (isso vem do fluxo OAuth).
 */
export const MetaAdsCapiConfigPatchSchema = z.object({
	pixelId: z.string({ invalid_type_error: "Tipo não válido para o ID do Pixel." }).optional().nullable(),
	capiDatasetId: z.string({ invalid_type_error: "Tipo não válido para o ID do dataset do CAPI." }).optional().nullable(),
	capiTestEventCode: z.string({ invalid_type_error: "Tipo não válido para o código de teste do CAPI." }).optional().nullable(),
	eventosCapi: z
		.array(z.string({ invalid_type_error: "Tipo não válido para evento do CAPI." }))
		.optional()
		.nullable(),
});
export type TMetaAdsCapiConfigPatch = z.infer<typeof MetaAdsCapiConfigPatchSchema>;

export const IntegrationConfigSchema = z.discriminatedUnion("tipo", [
	MetaAdsIntegrationConfigSchema,
	// MetaCapiIntegrationConfigSchema, TrackingIntegrationConfigSchema — fases futuras.
]);
export type TIntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
