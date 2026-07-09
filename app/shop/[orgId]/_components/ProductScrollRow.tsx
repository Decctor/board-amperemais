"use client";

import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import ProductCard from "./ProductCard";

type ProductScrollRowProps = {
	products: TShopCatalogProduct[];
};

// Swipeable row with scroll snapping. Products are tap targets, so they must not
// move on their own (the previous auto-scrolling marquee made cards drift under
// the user's thumb and burned CPU/battery on a page people leave open).
export default function ProductScrollRow({ products }: ProductScrollRowProps) {
	return (
		<div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
			{products.map((product) => (
				<div key={product.id} className="snap-start">
					<ProductCard product={product} />
				</div>
			))}
		</div>
	);
}
