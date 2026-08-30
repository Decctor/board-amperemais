import type { TSalesChannelCatalogModeEnum, TSalesChannelTypeEnum } from "@/schemas/enums";

export type TChannel = { canal: TSalesChannelTypeEnum; catalogoModo: TSalesChannelCatalogModeEnum };
export type TChannelOverride = { disponivel?: boolean | null; precoVenda?: number | null } | null;
export type TChannelOverrides = { product?: TChannelOverride; variant?: TChannelOverride };
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

export const SALES_CHANNEL_TYPES = ["POS", "SHOP", "COMANDA", "IFOOD"] as const;

/** Converte o `sales.canal` (texto livre) para o tipo do registro de canais, quando reconhecido. */
export function toSalesChannelType(canal: string | null | undefined): TSalesChannelTypeEnum | undefined {
	return (SALES_CHANNEL_TYPES as readonly string[]).includes(canal ?? "") ? (canal as TSalesChannelTypeEnum) : undefined;
}

// Preço é node-scoped: o override da variante vale para a variante, o do produto só para produto
// sem variante. Sem fallback cruzado — produto-com-variantes + override nível-produto é ambíguo
// e é rejeitado na escrita (PUT /api/products/channel-settings).
export function resolveChannelPrice(product: TChannelProduct, variant: TChannelVariant | null | undefined, overrides?: TChannelOverrides) {
	return variant ? (overrides?.variant?.precoVenda ?? variant.precoVenda ?? null) : (overrides?.product?.precoVenda ?? product.precoVenda ?? null);
}

// Disponibilidade herda em cadeia: o produto decide sua presença no canal (override do produto,
// senão o modo do canal); a variante só RESTRINGE dentro de um produto visível — uma linha
// disponivel=true numa variante não ressuscita um produto excluído do canal.
export function resolveChannelAvailability({
	product,
	variant,
	channel,
	overrides,
}: {
	product: TChannelProduct;
	variant?: TChannelVariant | null;
	channel: TChannel;
	overrides?: TChannelOverrides;
}) {
	if (!product.ativo || !product.vendavel) return false;
	if (!(overrides?.product?.disponivel ?? channel.catalogoModo === "TODOS")) return false;
	if (variant) {
		if (!variant.ativo) return false;
		if (overrides?.variant?.disponivel === false) return false;
	}
	if (channel.canal !== "SHOP") return true;

	// Política do canal SHOP: sem preço não lista, sem estoque rastreado não lista.
	const node = variant ?? product;
	const price = resolveChannelPrice(product, variant, overrides);
	return (price ?? 0) > 0 && (!node.rastreamentoEstoqueAtivo || (node.quantidade ?? 0) > 0);
}

/**
 * Projeta os grupos de adicionais para as regras DO CANAL: quando o canal não exige os mínimos,
 * todo grupo vira opcional (`minOpcoes` 0) para quem lê este catálogo. Os máximos não se movem —
 * relaxar a exigência é sobre poder seguir sem escolher, não sobre poder escolher demais.
 *
 * A projeção acontece no catálogo, e não em cada tela, porque o catálogo é a fonte comum: o
 * builder do PDV, a sacola da loja e a validação do pedido leem os mesmos grupos, então a regra
 * não pode divergir entre o que a tela bloqueia e o que o servidor aceita.
 *
 * Canal ausente (org ainda não materializada) preserva o comportamento legado: exige.
 */
export function channelAddOnReferences<TReference extends { grupo: { minOpcoes: number } }>(
	channel: { exigirAdicionaisMinimos: boolean } | null | undefined,
	references: TReference[],
): TReference[] {
	if (channel?.exigirAdicionaisMinimos !== false) return references;
	// A cópia só sobrescreve `minOpcoes`; o resto do grupo (opções, máximos, ordem) segue intacto,
	// então a asserção devolve o mesmo shape que entrou — o genérico é que não consegue provar isso.
	return references.map((reference) => ({ ...reference, grupo: { ...reference.grupo, minOpcoes: 0 } }) as TReference);
}
