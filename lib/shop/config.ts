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

	const { ativo, taxa, gratisAcima } = configuracoes.atendimento.entrega;
	// Entrega desligada: o painel nem exibe o campo da taxa, então o valor guardado é resíduo de uma
	// configuração antiga. Cobrá-lo no PDV (que usa esta mesma regra) seria cobrar uma taxa que a
	// organização não configurou.
	if (!ativo) return 0;
	if (gratisAcima !== null && gratisAcima !== undefined && subtotalItens >= gratisAcima) return 0;

	return round2(Math.max(taxa, 0));
}

function readPositiveNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? round2(value) : null;
}

// Taxa de entrega já persistida numa venda. Dois marcadores, um por origem: a loja digital grava no
// snapshot do checkout (`shop.entrega.taxa`) e o PDV grava na raiz do metadado do rascunho
// (`taxaEntrega`, escrito por `getDraftMetadata`/edição de venda confirmada). Vendas anteriores à
// taxa e vendas de canal não têm nenhum dos dois: nesses casos não há taxa destacada.
export function readShopDeliveryFee(rascunhoMetadados: unknown): number {
	if (!rascunhoMetadados || typeof rascunhoMetadados !== "object" || Array.isArray(rascunhoMetadados)) return 0;
	const metadata = rascunhoMetadados as { taxaEntrega?: unknown; shop?: { entrega?: { taxa?: unknown } } };
	// A raiz vem primeiro por ser reescrita a cada edição: num pedido da loja editado no PDV ela é a
	// versão corrente, enquanto o snapshot do checkout guarda o valor do momento do pedido.
	if (typeof metadata.taxaEntrega === "number") return readPositiveNumber(metadata.taxaEntrega) ?? 0;
	return readPositiveNumber(metadata.shop?.entrega?.taxa) ?? 0;
}

export function resolveFiscalShopDeliveryFee({
	rascunhoMetadados,
	modalidade,
	acrescimosTotal,
}: {
	rascunhoMetadados: unknown;
	modalidade: string | null;
	acrescimosTotal: number | null;
}): number {
	if (modalidade !== "ENTREGA") return 0;
	return Math.min(readShopDeliveryFee(rascunhoMetadados), round2(Math.max(acrescimosTotal ?? 0, 0)));
}
