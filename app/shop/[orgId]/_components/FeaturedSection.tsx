"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import { Star } from "lucide-react";
import ProductCard from "./ProductCard";

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

			<ScrollArea className="w-full">
				<div className="flex gap-3 px-4 pb-2">
					{products.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
				<ScrollBar orientation="horizontal" className="invisible" />
			</ScrollArea>
		</section>
	);
}
