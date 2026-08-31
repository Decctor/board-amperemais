import { ShopSettingsConfigurationSchema, type TShopSettingsConfiguration } from "@/schemas/shop";

export function normalizeShopSettingsConfiguration(configuracoes: unknown): TShopSettingsConfiguration {
	return ShopSettingsConfigurationSchema.parse(configuracoes);
}

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Fonte única da taxa de entrega: usada pelo checkout da loja (servidor) e pelos totais da vitrine (cliente).
// Retirada nunca paga taxa; entrega é isenta quando o subtotal de itens atinge o limite de entrega grátis.
export function resolveShopDeliveryFee({
	configuracoes,
	modalidade,
	subtotalItens,
}: {
	configuracoes: TShopSettingsConfiguration;
	modalidade: "RETIRADA" | "ENTREGA" | null;
	subtotalItens: number;
}): number {
	if (modalidade !== "ENTREGA") return 0;

	const { taxa, gratisAcima } = configuracoes.atendimento.entrega;
	if (gratisAcima !== null && gratisAcima !== undefined && subtotalItens >= gratisAcima) return 0;

	return round2(Math.max(taxa, 0));
}

// A taxa da loja digital vive no snapshot do checkout (rascunhoMetadados.shop.entrega.taxa).
// Pedidos anteriores à taxa, vendas de PDV e de canais não têm o campo: nesses casos não há taxa destacada.
export function readShopDeliveryFee(rascunhoMetadados: unknown): number {
	if (!rascunhoMetadados || typeof rascunhoMetadados !== "object" || Array.isArray(rascunhoMetadados)) return 0;
	const shop = (rascunhoMetadados as { shop?: { entrega?: { taxa?: unknown } } }).shop;
	const taxa = shop?.entrega?.taxa;
	return typeof taxa === "number" && Number.isFinite(taxa) && taxa > 0 ? round2(taxa) : 0;
}
