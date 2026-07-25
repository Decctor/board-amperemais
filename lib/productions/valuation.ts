import { type DBTransaction, db } from "@/services/drizzle";
import { productVariants, products } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Valoração de receitas e produções.
 *
 * Custo = soma do custo unitário dos produtos que compõem os insumos × quantidade.
 * Retorno esperado = soma do preço de venda dos produtos das saídas × quantidade.
 *
 * Receitas são sempre valoradas ao vivo (uma receita é um molde, não um fato). Produções concluídas
 * carregam um snapshot congelado no momento da conclusão — ver `services/drizzle/schema/productions.ts`.
 */

export type TProductPricing = {
	unitCost: number | null;
	salePrice: number | null;
};

export type TValuationItem = {
	productId: string;
	productVariantId?: string | null;
	quantity: number;
};

export type TValuation = {
	totalCost: number;
	expectedReturn: number;
	margin: number;
	/** Margem sobre o retorno esperado, em pontos percentuais. Nulo quando não há retorno para dividir. */
	marginPercentage: number | null;
	/** Falso quando algum insumo não tem custo cadastrado — o custo total está subestimado. */
	costIsComplete: boolean;
	/** Falso quando alguma saída não tem preço de venda cadastrado — o retorno está subestimado. */
	returnIsComplete: boolean;
};

export type TProductionValuation = TValuation & {
	/** Verdadeiro quando os valores vêm do snapshot da conclusão, falso quando são projeção do catálogo atual. */
	isSnapshot: boolean;
	snapshotDate: Date | null;
};

/** Chave de preço por produto + variante. A variante manda quando existe. */
export function buildPricingKey(productId: string, productVariantId?: string | null) {
	return `${productId}::${productVariantId ?? ""}`;
}

export type TProductPricingMap = Map<string, TProductPricing>;

/**
 * Carrega preços de custo e venda de todos os produtos/variantes referenciados pelos itens, em duas
 * queries — independente de quantas receitas ou produções estejam na página.
 */
export async function getProductPricingMap({
	trx,
	organizationId,
	items,
}: {
	trx?: DBTransaction;
	organizationId: string;
	items: TValuationItem[];
}): Promise<TProductPricingMap> {
	const client = trx ?? db;
	const pricingMap: TProductPricingMap = new Map();
	if (items.length === 0) return pricingMap;

	const productIds = [...new Set(items.map((item) => item.productId))];
	const variantIds = [...new Set(items.map((item) => item.productVariantId).filter((id): id is string => !!id))];

	const [productsResult, variantsResult] = await Promise.all([
		productIds.length > 0
			? client.query.products.findMany({
					where: and(inArray(products.id, productIds), eq(products.organizacaoId, organizationId)),
					columns: { id: true, precoCusto: true, precoVenda: true },
				})
			: [],
		variantIds.length > 0
			? client.query.productVariants.findMany({
					where: and(inArray(productVariants.id, variantIds), eq(productVariants.organizacaoId, organizationId)),
					columns: { id: true, produtoId: true, precoCusto: true, precoVenda: true },
				})
			: [],
	]);

	const productsById = new Map(productsResult.map((product) => [product.id, product]));
	for (const product of productsResult) {
		pricingMap.set(buildPricingKey(product.id, null), {
			unitCost: product.precoCusto ?? null,
			salePrice: product.precoVenda ?? null,
		});
	}

	for (const variant of variantsResult) {
		const product = productsById.get(variant.produtoId);
		pricingMap.set(buildPricingKey(variant.produtoId, variant.id), {
			// A variante pode não ter custo próprio cadastrado; nesse caso herda o do produto pai.
			unitCost: variant.precoCusto ?? product?.precoCusto ?? null,
			salePrice: variant.precoVenda ?? product?.precoVenda ?? null,
		});
	}

	return pricingMap;
}

/** Itens de entidade (colunas em português) aceitos pelas buscas de preço. */
type PricedEntityItem = { produtoId: string; produtoVarianteId?: string | null };

export function getItemUnitCost({ item, pricingMap }: { item: PricedEntityItem; pricingMap: TProductPricingMap }) {
	return pricingMap.get(buildPricingKey(item.produtoId, item.produtoVarianteId))?.unitCost ?? null;
}

export function getItemSalePrice({ item, pricingMap }: { item: PricedEntityItem; pricingMap: TProductPricingMap }) {
	return pricingMap.get(buildPricingKey(item.produtoId, item.produtoVarianteId))?.salePrice ?? null;
}

/** Fecha os totais a partir de custo e retorno já apurados (usado tanto pelo cálculo ao vivo quanto pelo snapshot). */
export function buildValuation({
	totalCost,
	expectedReturn,
	costIsComplete = true,
	returnIsComplete = true,
}: {
	totalCost: number;
	expectedReturn: number;
	costIsComplete?: boolean;
	returnIsComplete?: boolean;
}): TValuation {
	const margin = expectedReturn - totalCost;
	return {
		totalCost,
		expectedReturn,
		margin,
		marginPercentage: expectedReturn > 0 ? (margin / expectedReturn) * 100 : null,
		costIsComplete,
		returnIsComplete,
	};
}

/** Valoração ao vivo: custo dos insumos e retorno das saídas pelos preços vigentes no catálogo. */
export function calculateValuation({
	inputs,
	outputs,
	pricingMap,
}: {
	inputs: TValuationItem[];
	outputs: TValuationItem[];
	pricingMap: TProductPricingMap;
}): TValuation {
	let totalCost = 0;
	let costIsComplete = true;
	for (const input of inputs) {
		const unitCost = pricingMap.get(buildPricingKey(input.productId, input.productVariantId))?.unitCost ?? null;
		if (unitCost == null) {
			// Só conta como lacuna se a linha realmente movimenta quantidade.
			if (input.quantity > 0) costIsComplete = false;
			continue;
		}
		totalCost += unitCost * input.quantity;
	}

	let expectedReturn = 0;
	let returnIsComplete = true;
	for (const output of outputs) {
		const salePrice = pricingMap.get(buildPricingKey(output.productId, output.productVariantId))?.salePrice ?? null;
		if (salePrice == null) {
			if (output.quantity > 0) returnIsComplete = false;
			continue;
		}
		expectedReturn += salePrice * output.quantity;
	}

	return buildValuation({ totalCost, expectedReturn, costIsComplete, returnIsComplete });
}

/** Forma estrutural da entidade `productions` com seus itens — colunas em português, como no banco. */
type ProductionValuationSource = {
	custoTotal: number | null;
	retornoEsperado: number | null;
	dataSnapshotValores: Date | null;
	entradas: { produtoId: string; produtoVarianteId?: string | null; quantidadePrevista: number | null; quantidadeReal: number | null }[];
	saidas: { produtoId: string; produtoVarianteId?: string | null; quantidadePrevista: number | null; quantidadeReal: number | null }[];
};

/** Quantidade que vale para valoração: a real quando já informada, senão a prevista. */
export function getProductionItemQuantity(item: { quantidadePrevista: number | null; quantidadeReal: number | null }) {
	return item.quantidadeReal ?? item.quantidadePrevista ?? 0;
}

/** Itens de produção normalizados para `getProductPricingMap` — só faz sentido para produções sem snapshot. */
export function getProductionValuationItems(production: ProductionValuationSource): TValuationItem[] {
	if (production.dataSnapshotValores) return [];
	return [...production.entradas, ...production.saidas].map(toProductionValuationItem);
}

function toProductionValuationItem(item: ProductionValuationSource["entradas"][number]): TValuationItem {
	return {
		productId: item.produtoId,
		productVariantId: item.produtoVarianteId,
		quantity: getProductionItemQuantity(item),
	};
}

/**
 * Snapshot quando a produção já foi concluída, projeção pelo catálogo atual enquanto não foi.
 * `pricingMap` só é consultado no segundo caso.
 */
export function resolveProductionValuation({
	production,
	pricingMap,
}: {
	production: ProductionValuationSource;
	pricingMap: TProductPricingMap;
}): TProductionValuation {
	if (production.dataSnapshotValores) {
		return {
			...buildValuation({
				totalCost: production.custoTotal ?? 0,
				expectedReturn: production.retornoEsperado ?? 0,
			}),
			isSnapshot: true,
			snapshotDate: production.dataSnapshotValores,
		};
	}

	return {
		...calculateValuation({
			inputs: production.entradas.map(toProductionValuationItem),
			outputs: production.saidas.map(toProductionValuationItem),
			pricingMap,
		}),
		isSnapshot: false,
		snapshotDate: null,
	};
}
