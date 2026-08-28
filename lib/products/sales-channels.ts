import type { TSalesChannelCatalogModeEnum, TSalesChannelTypeEnum } from "@/schemas/enums";

export type TChannel = { canal: TSalesChannelTypeEnum; catalogoModo: TSalesChannelCatalogModeEnum };
export type TChannelOverride = { disponivel?: boolean | null; precoVenda?: number | null } | null;
export type TChannelProduct = {
	ativo?: boolean | null;
	vendavel: boolean;
	precoVenda?: number | null;
	rastreamentoEstoqueAtivo?: boolean | null;
	quantidade?: number | null;
};
export type TChannelVariant = {
	ativo?: boolean | null;
	precoVenda?: number | null;
	rastreamentoEstoqueAtivo?: boolean | null;
	quantidade?: number | null;
};

// Canais internos que toda organização tem. iFood entra só quando há integração conectada.
export const DEFAULT_SALES_CHANNELS = [
	{ canal: "POS", catalogoModo: "TODOS" },
	{ canal: "SHOP", catalogoModo: "TODOS" },
	{ canal: "COMANDA", catalogoModo: "TODOS" },
] as const satisfies readonly TChannel[];

export function resolveChannelPrice(product: TChannelProduct, variant: TChannelVariant | null | undefined, override?: TChannelOverride) {
	return override?.precoVenda ?? (variant ? variant.precoVenda : product.precoVenda) ?? null;
}

export function resolveChannelAvailability({
	product,
	variant,
	channel,
	override,
}: {
	product: TChannelProduct;
	variant?: TChannelVariant | null;
	channel: TChannel;
	override?: TChannelOverride;
}) {
	if (!product.ativo || !product.vendavel || (variant && !variant.ativo)) return false;
	if (!(override?.disponivel ?? channel.catalogoModo === "TODOS")) return false;
	if (channel.canal !== "SHOP") return true;
	const node = variant ?? product;
	const price = resolveChannelPrice(product, variant, override);
	return (price ?? 0) > 0 && (!node.rastreamentoEstoqueAtivo || (node.quantidade ?? 0) > 0);
}
