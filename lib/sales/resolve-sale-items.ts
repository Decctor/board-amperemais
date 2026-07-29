import type { DB, DBTransaction } from "@/services/drizzle";
import { productAddOnReferences, productVariants, products } from "@/services/drizzle/schema";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

type TDb = DB | DBTransaction;

export type TSaleItemResolutionErrorCode =
	| "PRODUTO_NAO_ENCONTRADO"
	| "PRODUTO_INATIVO"
	| "VARIANTE_NAO_ENCONTRADA"
	| "VARIANTE_INVALIDA"
	| "PRECO_AUSENTE"
	| "QUANTIDADE_INVALIDA"
	| "ADICIONAIS_NAO_SUPORTADOS";

export class SaleItemResolutionError extends Error {
	override name = "SaleItemResolutionError";

	constructor(
		public readonly code: TSaleItemResolutionErrorCode,
		message: string,
		public readonly produtos: string[] = [],
	) {
		super(message);
	}
}

export type TSaleItemReference = {
	produtoId: string;
	produtoVarianteId?: string | null;
	quantidade: number;
};

export type TResolvedSaleItem = {
	produtoId: string;
	produtoVarianteId: string | null;
	nome: string;
	variacao: string | null;
	codigo: string;
	imagemUrl: string | null;
	quantidade: number;
	preco: number;
	custo: number;
	total: number;
	custoTotal: number;
};

export function resolveSaleItemCost(productCost: number | null, variantCost?: number | null): number {
	return variantCost ?? productCost ?? 0;
}

export async function resolveSaleItems({
	db,
	organizacaoId,
	itens,
}: {
	db: TDb;
	organizacaoId: string;
	itens: TSaleItemReference[];
}): Promise<TResolvedSaleItem[]> {
	if (itens.length === 0) throw new SaleItemResolutionError("QUANTIDADE_INVALIDA", "Pelo menos um item é obrigatório.");

	for (const item of itens) {
		if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) {
			throw new SaleItemResolutionError("QUANTIDADE_INVALIDA", "A quantidade dos itens deve ser positiva.");
		}
	}

	const productIds = [...new Set(itens.map((item) => item.produtoId))];
	const variantIds = [...new Set(itens.map((item) => item.produtoVarianteId).filter((id): id is string => !!id))];

	const [foundProducts, foundVariants, addOnReferences] = await Promise.all([
		db.query.products.findMany({
			where: and(eq(products.organizacaoId, organizacaoId), inArray(products.id, productIds)),
			columns: {
				id: true,
				ativo: true,
				nome: true,
				codigo: true,
				imagemCapaUrl: true,
				precoVenda: true,
				precoCusto: true,
			},
		}),
		variantIds.length
			? db.query.productVariants.findMany({
					where: and(eq(productVariants.organizacaoId, organizacaoId), inArray(productVariants.id, variantIds)),
					columns: {
						id: true,
						produtoId: true,
						ativo: true,
						nome: true,
						codigo: true,
						imagemCapaUrl: true,
						precoVenda: true,
						precoCusto: true,
					},
				})
			: [],
		db
			.select({
				produtoId: productAddOnReferences.produtoId,
				produtoVarianteId: productAddOnReferences.produtoVarianteId,
			})
			.from(productAddOnReferences)
			.where(
				and(
					inArray(productAddOnReferences.produtoId, productIds),
					variantIds.length
						? or(
								inArray(productAddOnReferences.produtoVarianteId, variantIds),
								isNull(productAddOnReferences.produtoVarianteId),
							)
						: isNull(productAddOnReferences.produtoVarianteId),
				),
			),
	]);

	const productMap = new Map(foundProducts.map((product) => [product.id, product]));
	const variantMap = new Map(foundVariants.map((variant) => [variant.id, variant]));

	return itens.map((item) => {
		const product = productMap.get(item.produtoId);
		if (!product) {
			throw new SaleItemResolutionError("PRODUTO_NAO_ENCONTRADO", "Um produto não foi encontrado no catálogo da organização.");
		}
		if (!product.ativo) throw new SaleItemResolutionError("PRODUTO_INATIVO", `O produto "${product.nome}" está inativo.`, [product.nome]);

		const variant = item.produtoVarianteId ? variantMap.get(item.produtoVarianteId) : null;
		if (item.produtoVarianteId && !variant) {
			throw new SaleItemResolutionError("VARIANTE_NAO_ENCONTRADA", `Uma variação de "${product.nome}" não foi encontrada.`, [product.nome]);
		}
		if (variant && (variant.produtoId !== product.id || !variant.ativo)) {
			throw new SaleItemResolutionError("VARIANTE_INVALIDA", `A variação informada para "${product.nome}" não está disponível.`, [product.nome]);
		}

		const hasUnsupportedAddOns = addOnReferences.some(
			(reference) =>
				reference.produtoId === product.id &&
				(reference.produtoVarianteId === null || reference.produtoVarianteId === (variant?.id ?? null)),
		);
		if (hasUnsupportedAddOns) {
			throw new SaleItemResolutionError(
				"ADICIONAIS_NAO_SUPORTADOS",
				`O produto "${product.nome}" possui escolhas adicionais que precisam ser confirmadas pela equipe.`,
				[product.nome],
			);
		}

		const preco = variant?.precoVenda ?? product.precoVenda;
		if (preco == null) throw new SaleItemResolutionError("PRECO_AUSENTE", `O produto "${product.nome}" está sem preço de venda.`, [product.nome]);

		const custo = resolveSaleItemCost(product.precoCusto, variant?.precoCusto);

		return {
			produtoId: product.id,
			produtoVarianteId: variant?.id ?? null,
			nome: product.nome,
			variacao: variant?.nome ?? null,
			codigo: variant?.codigo || product.codigo,
			imagemUrl: variant?.imagemCapaUrl || product.imagemCapaUrl,
			quantidade: item.quantidade,
			preco,
			custo,
			total: preco * item.quantidade,
			custoTotal: custo * item.quantidade,
		};
	});
}
