import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import type { TShopCartItem } from "@/schemas/shop";

export function getShopCartSubtotal(items: TShopCartItem[], products: TShopCatalogProduct[]) {
	let total = 0;
	for (const item of items) {
		const product = products.find((candidate) => candidate.id === item.produtoId);
		if (!product) continue;

		const variant = item.produtoVarianteId ? product.variantes.find((candidate) => candidate.id === item.produtoVarianteId) : null;
		const references = [...product.addOnsReferencias, ...(variant?.addOnsReferencias ?? [])];
		let modifiersPrice = 0;

		for (const modifier of item.modificadores) {
			for (const reference of references) {
				const option = reference.grupo.opcoes.find((candidate) => candidate.id === modifier.opcaoId);
				if (option) modifiersPrice += option.precoDelta * modifier.quantidade;
			}
		}

		total += ((variant?.precoVenda ?? product.precoVenda ?? 0) + modifiersPrice) * item.quantidade;
	}

	return total;
}
