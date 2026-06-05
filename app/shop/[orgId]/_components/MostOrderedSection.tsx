"use client";

import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import { TrendingUp } from "lucide-react";
import ProductMarqueeRow from "./ProductMarqueeRow";

type MostOrderedSectionProps = {
	products: TShopCatalogProduct[];
};

export default function MostOrderedSection({ products }: MostOrderedSectionProps) {
	if (products.length === 0) return null;

	return (
		<section className="py-4">
			<div className="px-4 mb-3">
				<h2 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
					<TrendingUp className="w-4 h-4 text-green-500" />
					Mais pedidos
				</h2>
			</div>

			<ProductMarqueeRow products={products} />
		</section>
	);
}
