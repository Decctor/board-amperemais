"use client";

import { Marquee } from "@/components/ui/marquee";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import ProductCard from "./ProductCard";

type ProductMarqueeRowProps = {
	products: TShopCatalogProduct[];
};

export default function ProductMarqueeRow({ products }: ProductMarqueeRowProps) {
	return (
		<ScrollArea className="w-full">
			<Marquee duration={35} fade={false} pauseOnHover className="px-4 pb-2">
				{products.map((product) => (
					<div key={product.id} className="pr-3">
						<ProductCard product={product} />
					</div>
				))}
			</Marquee>
			<ScrollBar orientation="horizontal" className="invisible" />
		</ScrollArea>
	);
}
