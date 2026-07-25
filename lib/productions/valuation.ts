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
	precoCusto: number | null;
	precoVenda: number | null;
};

export type TValuationItem = {
	produtoId: string;
	produtoVarianteId?: string | null;
	quantidade: number;
};

export type TValuation = {
	custoTotal: number;
	retornoEsperado: number;
	margem: number;
	/** Margem sobre o retorno esperado, em pontos percentuais. Nulo quando não há retorno para dividir. */
	margemPercentual: number | null;
	/** Falso quando algum insumo não tem custo cadastrado — o custo total está subestimado. */
	custoCompleto: boolean;
	/** Falso quando alguma saída não tem preço de venda cadastrado — o retorno está subestimado. */
	retornoCompleto: boolean;
};

export type TProductionValuation = TValuation & {
	/** Verdadeiro quando os valores vêm do snapshot da conclusão, falso quando são projeção do catálogo atual. */
	ehSnapshot: boolean;
	dataSnapshotValores: Date | null;
};

/** Chave de preço por produto + variante. A variante manda quando existe. */
export function buildPricingKey(produtoId: string, produtoVarianteId?: string | null) {
	return `${produtoId}::${produtoVarianteId ?? ""}`;
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

	const productIds = [...new Set(items.map((item) => item.produtoId))];
	const variantIds = [...new Set(items.map((item) => item.produtoVarianteId).filter((id): id is string => !!id))];

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
			precoCusto: product.precoCusto ?? null,
			precoVenda: product.precoVenda ?? null,
		});
	}

	for (const variant of variantsResult) {
		const product = productsById.get(variant.produtoId);
		pricingMap.set(buildPricingKey(variant.produtoId, variant.id), {
			// A variante pode não ter custo próprio cadastrado; nesse caso herda o do produto pai.
			precoCusto: variant.precoCusto ?? product?.precoCusto ?? null,
			precoVenda: variant.precoVenda ?? product?.precoVenda ?? null,
		});
	}

	return pricingMap;
}

type PricedItem = Pick<TValuationItem, "produtoId" | "produtoVarianteId">;

export function getItemUnitCost({ item, pricingMap }: { item: PricedItem; pricingMap: TProductPricingMap }) {
	return pricingMap.get(buildPricingKey(item.produtoId, item.produtoVarianteId))?.precoCusto ?? null;
}

export function getItemUnitPrice({ item, pricingMap }: { item: PricedItem; pricingMap: TProductPricingMap }) {
	return pricingMap.get(buildPricingKey(item.produtoId, item.produtoVarianteId))?.precoVenda ?? null;
}

/** Fecha os totais a partir de custo e retorno já apurados (usado tanto pelo cálculo ao vivo quanto pelo snapshot). */
export function buildValuation({
	custoTotal,
	retornoEsperado,
	custoCompleto = true,
	retornoCompleto = true,
}: {
	custoTotal: number;
	retornoEsperado: number;
	custoCompleto?: boolean;
	retornoCompleto?: boolean;
}): TValuation {
	const margem = retornoEsperado - custoTotal;
	return {
		custoTotal,
		retornoEsperado,
		margem,
		margemPercentual: retornoEsperado > 0 ? (margem / retornoEsperado) * 100 : null,
		custoCompleto,
		retornoCompleto,
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
	let custoTotal = 0;
	let custoCompleto = true;
	for (const input of inputs) {
		const unitCost = getItemUnitCost({ item: input, pricingMap });
		if (unitCost == null) {
			// Só conta como lacuna se a linha realmente movimenta quantidade.
			if (input.quantidade > 0) custoCompleto = false;
			continue;
		}
		custoTotal += unitCost * input.quantidade;
	}

	let retornoEsperado = 0;
	let retornoCompleto = true;
	for (const output of outputs) {
		const unitPrice = getItemUnitPrice({ item: output, pricingMap });
		if (unitPrice == null) {
			if (output.quantidade > 0) retornoCompleto = false;
			continue;
		}
		retornoEsperado += unitPrice * output.quantidade;
	}

	return buildValuation({ custoTotal, retornoEsperado, custoCompleto, retornoCompleto });
}

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
	return [...production.entradas, ...production.saidas].map((item) => ({
		produtoId: item.produtoId,
		produtoVarianteId: item.produtoVarianteId,
		quantidade: getProductionItemQuantity(item),
	}));
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
				custoTotal: production.custoTotal ?? 0,
				retornoEsperado: production.retornoEsperado ?? 0,
			}),
			ehSnapshot: true,
			dataSnapshotValores: production.dataSnapshotValores,
		};
	}

	const toItem = (item: ProductionValuationSource["entradas"][number]) => ({
		produtoId: item.produtoId,
		produtoVarianteId: item.produtoVarianteId,
		quantidade: getProductionItemQuantity(item),
	});

	return {
		...calculateValuation({
			inputs: production.entradas.map(toItem),
			outputs: production.saidas.map(toItem),
			pricingMap,
		}),
		ehSnapshot: false,
		dataSnapshotValores: null,
	};
}
