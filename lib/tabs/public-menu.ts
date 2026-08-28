import { channelNodePrice, channelProductFilter, loadChannelState } from "@/lib/products/sales-channels-store";
import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { and, eq, inArray, notInArray } from "drizzle-orm";

/**
 * Cardápio público da comanda (QR do ponto e QR da tab): produtos ativos e vendáveis da
 * organização, respeitando a disponibilidade do canal COMANDA (linhas esparsas da matriz).
 * Canal ausente = org não materializada ainda — comporta-se como TODOS sem overrides.
 */
export async function getComandaMenuProducts({ orgId }: { orgId: string }) {
	const conditions = [eq(products.organizacaoId, orgId), eq(products.ativo, true), eq(products.vendavel, true)];

	const channelState = await loadChannelState({ orgId, canal: "COMANDA" });
	if (channelState) {
		const filter = channelProductFilter(channelState);
		if (filter.includeIds) {
			if (filter.includeIds.length === 0) return [];
			conditions.push(inArray(products.id, filter.includeIds));
		}
		if (filter.excludeIds) conditions.push(notInArray(products.id, filter.excludeIds));
	}

	const rows = await db.query.products.findMany({
		where: and(...conditions),
		columns: { id: true, nome: true, grupo: true, descricao: true, precoVenda: true, imagemCapaUrl: true },
		with: {
			variantes: {
				where: (fields, { eq: eqOp }) => eqOp(fields.ativo, true),
				columns: { id: true, nome: true, precoVenda: true },
			},
		},
		orderBy: (fields, { asc }) => asc(fields.nome),
	});

	return rows.map((product) => ({
		...product,
		// Preço resolvido do canal COMANDA — o mesmo que a aprovação/lançamento vai cobrar.
		precoVenda: channelNodePrice(channelState, { produtoId: product.id, precoVenda: product.precoVenda }),
		// Linha de variante só restringe dentro de um produto visível (mesma regra do resolver).
		variantes: product.variantes
			.filter((variant) => channelState?.variantOverrides.get(variant.id)?.disponivel !== false)
			.map((variant) => ({
				...variant,
				precoVenda: channelNodePrice(channelState, { produtoId: product.id, produtoVarianteId: variant.id, precoVenda: variant.precoVenda }) ?? 0,
			})),
	}));
}

/**
 * Ids de produtos que a comanda aceita em pedidos — o gate de ESCRITA correspondente ao cardápio
 * acima. Usado pela validação da solicitação pública e pela aprovação do operador; devolve o
 * subconjunto de `productIds` que passa (existência, atividade, vendabilidade e canal COMANDA).
 */
export async function filterComandaOrderableProductIds({ orgId, productIds }: { orgId: string; productIds: string[] }) {
	if (productIds.length === 0) return new Set<string>();

	const conditions = [eq(products.organizacaoId, orgId), eq(products.ativo, true), eq(products.vendavel, true), inArray(products.id, productIds)];

	const channelState = await loadChannelState({ orgId, canal: "COMANDA" });
	if (channelState) {
		const filter = channelProductFilter(channelState);
		if (filter.includeIds) {
			if (filter.includeIds.length === 0) return new Set<string>();
			conditions.push(inArray(products.id, filter.includeIds));
		}
		if (filter.excludeIds) conditions.push(notInArray(products.id, filter.excludeIds));
	}

	const rows = await db
		.select({ id: products.id })
		.from(products)
		.where(and(...conditions));
	return new Set(rows.map((row) => row.id));
}
