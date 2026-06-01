import { ShopSettingsConfigurationSchema, type TShopSettingsConfiguration } from "@/schemas/shop";

export function normalizeShopSettingsConfiguration(configuracoes: unknown): TShopSettingsConfiguration {
	return ShopSettingsConfigurationSchema.parse(configuracoes);
}
