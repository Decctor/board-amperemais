import { DEFAULT_SHOP_SETTINGS_CONFIGURATION, ShopSettingsConfigurationSchema, type TShopSettingsConfiguration } from "@/schemas/shop";
import type { TShopSettingsEntity } from "@/services/drizzle/schema";

export function normalizeShopSettingsConfiguration(configuracoes: unknown): TShopSettingsConfiguration {
	return ShopSettingsConfigurationSchema.parse({
		...DEFAULT_SHOP_SETTINGS_CONFIGURATION,
		...(typeof configuracoes === "object" && configuracoes !== null ? configuracoes : {}),
	});
}

export function buildDefaultShopSettings(orgId: string): Omit<TShopSettingsEntity, "id" | "dataInsercao" | "dataAtualizacao"> & {
	id: null;
	dataInsercao: null;
	dataAtualizacao: null;
} {
	return {
		id: null,
		organizacaoId: orgId,
		ativo: false,
		modo: "CARDAPIO",
		configuracoes: DEFAULT_SHOP_SETTINGS_CONFIGURATION,
		dataInsercao: null,
		dataAtualizacao: null,
	};
}
