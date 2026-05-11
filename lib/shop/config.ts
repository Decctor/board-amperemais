import { DEFAULT_SHOP_SETTINGS_CONFIGURATION, ShopSettingsConfigurationSchema, type TShopSettingsConfiguration } from "@/schemas/shop";

export function normalizeShopSettingsConfiguration(configuracoes: unknown): TShopSettingsConfiguration {
	return ShopSettingsConfigurationSchema.parse({
		...DEFAULT_SHOP_SETTINGS_CONFIGURATION,
		...(typeof configuracoes === "object" && configuracoes !== null ? configuracoes : {}),
	});
}
