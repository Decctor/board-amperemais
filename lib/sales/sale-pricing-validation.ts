import { db } from "@/services/drizzle";
import createHttpError from "http-errors";

/**
 * Tolerância de centavos única para o recálculo server-side de valores de venda e para a
 * validação de aprovações de desconto. Cobre arredondamentos de serialização — divergências
 * reais (preço de catálogo alterado ou payload adulterado) sempre excedem a tolerância.
 */
export const SALE_PRICING_CENT_TOLERANCE = 0.01;

export function saleValuesDiverge(a: number, b: number, tolerance: number = SALE_PRICING_CENT_TOLERANCE): boolean {
	return Math.abs(a - b) > tolerance + 1e-9;
}

type TSaleItemModifierPricingInput = {
	opcaoId: string;
	quantidade: number;
	valorUnitario: number;
	valorTotal: number;
};

type TSaleItemPricingInput = {
	produtoId: string;
	produtoVarianteId?: string | null;
	nome: string;
	quantidade: number;
	valorUnitarioBase: number;
	valorModificadores: number;
	valorUnitarioFinal: number;
	valorTotalBruto: number;
	valorDesconto: number;
	valorTotalLiquido: number;
	modificadores: TSaleItemModifierPricingInput[];
};

type TCatalogPrices = {
	productPriceMap: Map<string, number>;
	variantMap: Map<string, { id: string; produtoId: string; precoVenda: number }>;
	optionPriceMap: Map<string, number>;
};

/** Preços vigentes do catálogo para os produtos/variantes/opções citados pelos itens. */
async function loadCatalogPrices({
	orgId,
	productIds,
	variantIds,
	optionIds,
}: {
	orgId: string;
	productIds: string[];
	variantIds: string[];
	optionIds: string[];
}): Promise<TCatalogPrices> {
	const [produtos, variantes, opcoes] = await Promise.all([
		productIds.length > 0
			? db.query.products.findMany({
					where: (fields, { and, eq, inArray }) => and(inArray(fields.id, productIds), eq(fields.organizacaoId, orgId)),
					columns: { id: true, precoVenda: true },
				})
			: [],
		variantIds.length > 0
			? db.query.productVariants.findMany({
					where: (fields, { and, eq, inArray }) => and(inArray(fields.id, variantIds), eq(fields.organizacaoId, orgId)),
					columns: { id: true, produtoId: true, precoVenda: true },
				})
			: [],
		optionIds.length > 0
			? db.query.productAddOnOptions.findMany({
					where: (fields, { and, eq, inArray }) => and(inArray(fields.id, optionIds), eq(fields.organizacaoId, orgId)),
					columns: { id: true, precoDelta: true },
				})
			: [],
	]);

	return {
		productPriceMap: new Map(produtos.map((p) => [p.id, p.precoVenda ?? 0])),
		variantMap: new Map(variantes.map((v) => [v.id, v])),
		optionPriceMap: new Map(opcoes.map((o) => [o.id, o.precoDelta])),
	};
}

/**
 * Recalcula server-side os valores de cada item da venda a partir dos preços atuais do catálogo
 * (variante/produto + modificadores × quantidade) e rejeita o payload quando os números enviados
 * pelo cliente divergem do recálculo. O `valorDesconto` do cliente é tratado como pedido a validar
 * (não-negativo e limitado ao bruto do item), nunca como fato — sem isso qualquer teto de desconto
 * seria contornável enviando líquidos arbitrários.
 */
export async function validateSaleItemsPricing({ orgId, itens }: { orgId: string; itens: TSaleItemPricingInput[] }): Promise<void> {
	const { productPriceMap, variantMap, optionPriceMap } = await loadCatalogPrices({
		orgId,
		productIds: [...new Set(itens.map((item) => item.produtoId))],
		variantIds: [...new Set(itens.map((item) => item.produtoVarianteId).filter((id): id is string => !!id))],
		optionIds: [...new Set(itens.flatMap((item) => item.modificadores.map((mod) => mod.opcaoId)))],
	});

	for (const item of itens) {
		if (!productPriceMap.has(item.produtoId)) {
			throw new createHttpError.BadRequest(`O produto do item "${item.nome}" não foi encontrado no catálogo da organização.`);
		}

		let precoBase = productPriceMap.get(item.produtoId) ?? 0;
		if (item.produtoVarianteId) {
			const variante = variantMap.get(item.produtoVarianteId);
			if (!variante || variante.produtoId !== item.produtoId) {
				throw new createHttpError.BadRequest(`A variante do item "${item.nome}" não foi encontrada no catálogo da organização.`);
			}
			precoBase = variante.precoVenda;
		}

		let valorModificadores = 0;
		for (const mod of item.modificadores) {
			const precoDelta = optionPriceMap.get(mod.opcaoId);
			if (precoDelta === undefined) {
				throw new createHttpError.BadRequest(`Um modificador do item "${item.nome}" não foi encontrado no catálogo da organização.`);
			}
			if (saleValuesDiverge(mod.valorUnitario, precoDelta) || saleValuesDiverge(mod.valorTotal, precoDelta * mod.quantidade)) {
				throw new createHttpError.BadRequest(`Os valores dos modificadores do item "${item.nome}" não conferem com o catálogo. Atualize o carrinho.`);
			}
			valorModificadores += precoDelta * mod.quantidade;
		}

		const valorUnitarioFinal = precoBase + valorModificadores;
		const valorTotalBruto = valorUnitarioFinal * item.quantidade;

		if (
			saleValuesDiverge(item.valorUnitarioBase, precoBase) ||
			saleValuesDiverge(item.valorModificadores, valorModificadores) ||
			saleValuesDiverge(item.valorUnitarioFinal, valorUnitarioFinal) ||
			saleValuesDiverge(item.valorTotalBruto, valorTotalBruto)
		) {
			throw new createHttpError.BadRequest(`Os valores do item "${item.nome}" não conferem com os preços atuais do catálogo. Atualize o carrinho.`);
		}

		if (item.valorDesconto < -SALE_PRICING_CENT_TOLERANCE) {
			throw new createHttpError.BadRequest(`O desconto do item "${item.nome}" não pode ser negativo.`);
		}
		if (item.valorDesconto > valorTotalBruto + SALE_PRICING_CENT_TOLERANCE) {
			throw new createHttpError.BadRequest(`O desconto do item "${item.nome}" não pode superar o valor bruto do item.`);
		}
		if (saleValuesDiverge(item.valorTotalLiquido, valorTotalBruto - item.valorDesconto)) {
			throw new createHttpError.BadRequest(`O valor líquido do item "${item.nome}" não confere com o bruto menos o desconto. Atualize o carrinho.`);
		}
	}
}

type TSaleItemDriftInput = {
	id: string;
	nome: string;
	produtoId: string;
	produtoVarianteId?: string | null;
	quantidade: number;
	valorVendaUnitario: number;
	valorVendaTotalBruto: number;
	modificadores: { opcaoId: string | null; quantidade: number }[];
};

/** Viaja como dado para a interface, então os campos seguem a língua do payload. */
export type TSaleItemPricingDrift = {
	itemId: string;
	nome: string;
	quantidade: number;
	valorUnitarioSalvo: number;
	/** `null` quando o produto, a variante ou um modificador saiu do catálogo. */
	valorUnitarioAtual: number | null;
	/** Decomposição do unitário atual, para o carrinho se atualizar sem recalcular o catálogo. */
	valorUnitarioBaseAtual: number | null;
	valorModificadoresAtual: number | null;
	valorTotalBrutoSalvo: number;
	valorTotalBrutoAtual: number | null;
	divergente: boolean;
	indisponivel: boolean;
};

export type TSalePricingDrift = {
	itens: TSaleItemPricingDrift[];
	algumDivergente: boolean;
	algumIndisponivel: boolean;
	totalBrutoSalvo: number;
	/** `null` quando algum item ficou indisponível — não há total atual honesto a mostrar. */
	totalBrutoAtual: number | null;
};

/**
 * Compara os valores congelados nos itens de um rascunho com os preços vigentes do catálogo.
 *
 * Diferente de `validateSaleItemsPricing`, que rejeita, esta função apenas descreve a divergência:
 * a interface do checkout precisa nomear o que mudou e oferecer a atualização antes de bloquear a
 * confirmação. Um orçamento de três semanas confirmado a preço antigo é perda de margem silenciosa.
 */
export async function computeSaleItemsPricingDrift({ orgId, itens }: { orgId: string; itens: TSaleItemDriftInput[] }): Promise<TSalePricingDrift> {
	const { productPriceMap, variantMap, optionPriceMap } = await loadCatalogPrices({
		orgId,
		productIds: [...new Set(itens.map((item) => item.produtoId))],
		variantIds: [...new Set(itens.map((item) => item.produtoVarianteId).filter((id): id is string => !!id))],
		optionIds: [...new Set(itens.flatMap((item) => item.modificadores.map((mod) => mod.opcaoId).filter((id): id is string => !!id)))],
	});

	const linhas = itens.map((item): TSaleItemPricingDrift => {
		const precoProduto = productPriceMap.get(item.produtoId);
		const variante = item.produtoVarianteId ? variantMap.get(item.produtoVarianteId) : null;
		const varianteInvalida = !!item.produtoVarianteId && (!variante || variante.produtoId !== item.produtoId);

		let modificadoresIndisponivel = false;
		let valorModificadores = 0;
		for (const mod of item.modificadores) {
			const precoDelta = mod.opcaoId ? optionPriceMap.get(mod.opcaoId) : undefined;
			if (precoDelta === undefined) {
				modificadoresIndisponivel = true;
				break;
			}
			valorModificadores += precoDelta * mod.quantidade;
		}

		const indisponivel = precoProduto === undefined || varianteInvalida || modificadoresIndisponivel;
		if (indisponivel) {
			return {
				itemId: item.id,
				nome: item.nome,
				quantidade: item.quantidade,
				valorUnitarioSalvo: item.valorVendaUnitario,
				valorUnitarioAtual: null,
				valorUnitarioBaseAtual: null,
				valorModificadoresAtual: null,
				valorTotalBrutoSalvo: item.valorVendaTotalBruto,
				valorTotalBrutoAtual: null,
				divergente: true,
				indisponivel: true,
			};
		}

		const precoBase = variante ? variante.precoVenda : (precoProduto ?? 0);
		const valorUnitarioAtual = precoBase + valorModificadores;
		const valorTotalBrutoAtual = valorUnitarioAtual * item.quantidade;

		return {
			itemId: item.id,
			nome: item.nome,
			quantidade: item.quantidade,
			valorUnitarioSalvo: item.valorVendaUnitario,
			valorUnitarioAtual,
			valorUnitarioBaseAtual: precoBase,
			valorModificadoresAtual: valorModificadores,
			valorTotalBrutoSalvo: item.valorVendaTotalBruto,
			valorTotalBrutoAtual,
			divergente: saleValuesDiverge(item.valorVendaUnitario, valorUnitarioAtual) || saleValuesDiverge(item.valorVendaTotalBruto, valorTotalBrutoAtual),
			indisponivel: false,
		};
	});

	const algumIndisponivel = linhas.some((linha) => linha.indisponivel);

	return {
		itens: linhas,
		algumDivergente: linhas.some((linha) => linha.divergente),
		algumIndisponivel,
		totalBrutoSalvo: linhas.reduce((sum, linha) => sum + linha.valorTotalBrutoSalvo, 0),
		totalBrutoAtual: algumIndisponivel ? null : linhas.reduce((sum, linha) => sum + (linha.valorTotalBrutoAtual ?? 0), 0),
	};
}
