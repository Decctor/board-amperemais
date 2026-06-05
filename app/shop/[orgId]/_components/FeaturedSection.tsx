"use client";

import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import { Star } from "lucide-react";
import ProductMarqueeRow from "./ProductMarqueeRow";

type FeaturedSectionProps = {
	products: TShopCatalogProduct[];
};

export default function FeaturedSection({ products }: FeaturedSectionProps) {
	if (products.length === 0) return null;

	return (
		<section className="py-4">
			<div className="px-4 mb-3">
				<h2 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
					<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
					Em destaque
				</h2>
			</div>

			<ProductMarqueeRow products={products} />
		</section>
	);
}
