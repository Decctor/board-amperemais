"use client";

import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import ProductCard from "./ProductCard";

type ProductGroupSectionProps = {
	groupName: string;
	products: TShopCatalogProduct[];
	id?: string;
};

export default function ProductGroupSection({ groupName, products, id }: ProductGroupSectionProps) {
	if (products.length === 0) return null;

	return (
		<section id={id} className="py-4 scroll-mt-20">
			<div className="px-4 mb-3">
				<h2 className="font-black text-sm uppercase tracking-wide">{groupName}</h2>
			</div>

			<div className="px-4 flex flex-col gap-2">
				{products.map((product) => (
					<ProductCard key={product.id} product={product} variant="full" />
				))}
			</div>
		</section>
	);
}
