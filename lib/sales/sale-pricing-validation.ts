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

/**
 * Recalcula server-side os valores de cada item da venda a partir dos preços atuais do catálogo
 * (variante/produto + modificadores × quantidade) e rejeita o payload quando os números enviados
 * pelo cliente divergem do recálculo. O `valorDesconto` do cliente é tratado como pedido a validar
 * (não-negativo e limitado ao bruto do item), nunca como fato — sem isso qualquer teto de desconto
 * seria contornável enviando líquidos arbitrários.
 */
export async function validateSaleItemsPricing({ orgId, itens }: { orgId: string; itens: TSaleItemPricingInput[] }): Promise<void> {
	const productIds = [...new Set(itens.map((item) => item.produtoId))];
	const variantIds = [...new Set(itens.map((item) => item.produtoVarianteId).filter((id): id is string => !!id))];
	const optionIds = [...new Set(itens.flatMap((item) => item.modificadores.map((mod) => mod.opcaoId)))];

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

	const productPriceMap = new Map(produtos.map((p) => [p.id, p.precoVenda ?? 0]));
	const variantMap = new Map(variantes.map((v) => [v.id, v]));
	const optionPriceMap = new Map(opcoes.map((o) => [o.id, o.precoDelta]));

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
