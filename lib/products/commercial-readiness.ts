import type { DB, DBTransaction } from "@/services/drizzle";
import { productAddOnReferences, products } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

type TDb = DB | DBTransaction;

export async function getCatalogCommercialReadiness({ db, organizacaoId }: { db: TDb; organizacaoId: string }) {
	const catalog = await db.query.products.findMany({
		where: and(eq(products.organizacaoId, organizacaoId), eq(products.ativo, true)),
		columns: { id: true, precoVenda: true, precoCusto: true },
		with: {
			variantes: {
				where: (variant, { eq: equals }) => equals(variant.ativo, true),
				columns: { id: true, precoVenda: true, precoCusto: true },
			},
		},
	});

	const productIds = catalog.map((product) => product.id);
	const addOnReferences =
		productIds.length === 0
			? []
			: await db
					.select({
						produtoId: productAddOnReferences.produtoId,
						produtoVarianteId: productAddOnReferences.produtoVarianteId,
					})
					.from(productAddOnReferences)
					.where(inArray(productAddOnReferences.produtoId, productIds));

	const items = catalog.flatMap((product) =>
		product.variantes.length > 0
			? product.variantes.map((variant) => ({
					preco: variant.precoVenda,
					custo: variant.precoCusto ?? product.precoCusto,
					comAdicionais: addOnReferences.some(
						(reference) =>
							reference.produtoId === product.id &&
							(reference.produtoVarianteId === null || reference.produtoVarianteId === variant.id),
					),
				}))
			: [
					{
						preco: product.precoVenda,
						custo: product.precoCusto,
						comAdicionais: addOnReferences.some(
							(reference) => reference.produtoId === product.id && reference.produtoVarianteId === null,
						),
					},
				],
	);

	const semPreco = items.filter((item) => item.preco == null).length;
	const semCusto = items.filter((item) => item.custo == null).length;
	const comAdicionais = items.filter((item) => item.comAdicionais).length;
	const aptos = items.filter((item) => item.preco != null && !item.comAdicionais).length;

	return {
		itensAtivos: items.length,
		aptos,
		semPreco,
		semCusto,
		comAdicionais,
	};
}
