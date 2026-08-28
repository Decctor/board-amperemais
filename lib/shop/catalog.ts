import { db } from "@/services/drizzle";
import { productAddOnReferences, productChannelSettings, products, saleItems, sales, salesChannels } from "@/services/drizzle/schema";
import { and, desc, eq, gt, inArray, isNull, notInArray, sql } from "drizzle-orm";
import type { TShopSettingsConfiguration } from "@/schemas/shop";

export const SHOP_MOST_ORDERED_DAYS = 90;

function getProductEligibilityConditions(orgId: string) {
	return [eq(products.organizacaoId, orgId), eq(products.ativo, true), eq(products.vendavel, true), gt(products.precoVenda, 0)];
}

export function productIsAvailableForShop(product: { rastreamentoEstoqueAtivo: boolean | null; quantidade: number | null }) {
	return !product.rastreamentoEstoqueAtivo || (product.quantidade ?? 0) > 0;
}

export function variantIsAvailableForShop(variant: { rastreamentoEstoqueAtivo: boolean | null; quantidade: number | null }) {
	return !variant.rastreamentoEstoqueAtivo || (variant.quantidade ?? 0) > 0;
}

/**
 * Estado do canal SHOP para a leitura do catálogo. Nulo quando a organização ainda não tem a
 * linha do canal (migração 0082 não aplicada ou org não migrada) — o catálogo então cai no
 * caminho legado do jsonb. Nesta fase só a DISPONIBILIDADE vem do canal; o preço por canal
 * entra na fase 3 junto da precificação, para exibição e cobrança mudarem juntas.
 */
async function loadShopChannelState(orgId: string) {
	const channel = await db.query.salesChannels.findFirst({
		where: and(
			eq(salesChannels.organizacaoId, orgId),
			eq(salesChannels.canal, "SHOP"),
			isNull(salesChannels.integracaoId),
			isNull(salesChannels.refExterno),
		),
	});
	if (!channel) return null;

	const overrides = await db.query.productChannelSettings.findMany({
		where: eq(productChannelSettings.canalVendaId, channel.id),
		columns: { produtoId: true, produtoVarianteId: true, disponivel: true },
	});

	const productAvailability = new Map<string, boolean | null>();
	const variantAvailability = new Map<string, boolean | null>();
	for (const override of overrides) {
		if (override.produtoVarianteId) variantAvailability.set(override.produtoVarianteId, override.disponivel);
		else productAvailability.set(override.produtoId, override.disponivel);
	}

	return { channel, productAvailability, variantAvailability };
}

export async function getShopCatalogProducts({ orgId, configuracoes }: { orgId: string; configuracoes: TShopSettingsConfiguration }) {
	const conditions = getProductEligibilityConditions(orgId);
	const channelState = await loadShopChannelState(orgId);

	if (channelState) {
		// Fonte nova: modo do canal + linhas esparsas de disponibilidade.
		if (channelState.channel.catalogoModo === "SELECIONADOS") {
			const includedIds = [...channelState.productAvailability.entries()].filter(([, disponivel]) => disponivel === true).map(([id]) => id);
			if (includedIds.length === 0) return [];
			conditions.push(inArray(products.id, includedIds));
		} else {
			const excludedIds = [...channelState.productAvailability.entries()].filter(([, disponivel]) => disponivel === false).map(([id]) => id);
			if (excludedIds.length > 0) conditions.push(notInArray(products.id, excludedIds));
		}
	} else {
		// Caminho legado (dual-read): o bloco produtos do jsonb ainda é a fonte enquanto a org
		// não tem o canal SHOP materializado. Remover junto com o bloco modo/produtoIds do jsonb.
		const selectedProductIds = configuracoes.produtos.produtoIds;

		if (configuracoes.produtos.modo === "INCLUIR") {
			if (selectedProductIds.length === 0) return [];
			conditions.push(inArray(products.id, selectedProductIds));
		}

		if (configuracoes.produtos.modo === "EXCLUIR" && selectedProductIds.length > 0) {
			conditions.push(notInArray(products.id, selectedProductIds));
		}
	}

	const productsResult = await db.query.products.findMany({
		where: and(...conditions),
		with: {
			variantes: {
				where: (fields, { eq, gt, or, isNull, and }) =>
					and(
						eq(fields.ativo, true),
						gt(fields.precoVenda, 0),
						or(eq(fields.rastreamentoEstoqueAtivo, false), isNull(fields.rastreamentoEstoqueAtivo), gt(fields.quantidade, 0)),
					),
				orderBy: (fields, { asc }) => asc(fields.precoVenda),
				with: {
					addOnsReferencias: {
						with: {
							grupo: {
								with: {
									opcoes: {
										where: (fields, { eq }) => eq(fields.ativo, true),
										orderBy: (fields, { asc }) => asc(fields.nome),
										with: {
											produto: { columns: { imagemCapaUrl: true } },
											produtoVariante: { columns: { imagemCapaUrl: true } },
										},
									},
								},
							},
						},
						orderBy: (fields, { asc }) => asc(fields.ordem),
					},
				},
			},
			addOnsReferencias: {
				where: (fields, { isNull }) => isNull(fields.produtoVarianteId),
				with: {
					grupo: {
						with: {
							opcoes: {
								where: (fields, { eq }) => eq(fields.ativo, true),
								orderBy: (fields, { asc }) => asc(fields.nome),
								with: {
									produto: { columns: { imagemCapaUrl: true } },
									produtoVariante: { columns: { imagemCapaUrl: true } },
								},
							},
						},
					},
				},
				orderBy: (fields, { asc }) => asc(fields.ordem),
			},
		},
		orderBy: (fields, { asc }) => asc(fields.nome),
	});

	return productsResult.filter(productIsAvailableForShop).map((product) => ({
		...product,
		addOnsReferencias: product.addOnsReferencias.filter((reference) => reference.grupo.ativo && reference.grupo.opcoes.length > 0),
		variantes: product.variantes
			.filter(variantIsAvailableForShop)
			// Linha de variante só restringe dentro de um produto visível (mesma regra do resolver).
			.filter((variant) => channelState?.variantAvailability.get(variant.id) !== false)
			.map((variant) => ({
				...variant,
				addOnsReferencias: variant.addOnsReferencias.filter((reference) => reference.grupo.ativo && reference.grupo.opcoes.length > 0),
			})),
	}));
}

export type TShopCatalogProduct = Awaited<ReturnType<typeof getShopCatalogProducts>>[number];

export async function getMostOrderedShopProductIds({ orgId, limit = 12 }: { orgId: string; limit?: number }) {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - SHOP_MOST_ORDERED_DAYS);

	const result = await db
		.select({
			produtoId: saleItems.produtoId,
			totalQuantidade: sql<number>`sum(${saleItems.quantidade})`,
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(sales.organizacaoId, orgId), eq(sales.statusVenda, "CONFIRMADA"), gt(sales.dataVenda, cutoff)))
		.groupBy(saleItems.produtoId)
		.orderBy(desc(sql`sum(${saleItems.quantidade})`))
		.limit(limit);

	return result.map((item) => item.produtoId);
}

export function orderProductsByIds<T extends { id: string }>(items: T[], ids: string[]) {
	const orderMap = new Map(ids.map((id, index) => [id, index]));
	return items
		.filter((item) => orderMap.has(item.id))
		.toSorted((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

export async function getShopProductReferencesForValidation(productIds: string[], variantIds: string[]) {
	const [productRows, variantRows, referenceRows] = await Promise.all([
		productIds.length
			? db.query.products.findMany({
					where: (fields, { inArray }) => inArray(fields.id, productIds),
					with: {
						addOnsReferencias: {
							where: (fields, { isNull }) => isNull(fields.produtoVarianteId),
							with: {
								grupo: {
									with: {
										opcoes: true,
									},
								},
							},
						},
					},
				})
			: [],
		variantIds.length
			? db.query.productVariants.findMany({
					where: (fields, { inArray }) => inArray(fields.id, variantIds),
					with: {
						addOnsReferencias: {
							with: {
								grupo: {
									with: {
										opcoes: true,
									},
								},
							},
						},
					},
				})
			: [],
		productIds.length || variantIds.length
			? db
					.select()
					.from(productAddOnReferences)
					.where(
						and(
							productIds.length ? inArray(productAddOnReferences.produtoId, productIds) : sql`true`,
							variantIds.length ? inArray(productAddOnReferences.produtoVarianteId, variantIds) : sql`true`,
						),
					)
			: [],
	]);

	return { productRows, variantRows, referenceRows };
}
