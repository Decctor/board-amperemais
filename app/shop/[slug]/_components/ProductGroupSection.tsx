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
			<div className="mb-3 px-4">
				<div className="flex w-fit items-center gap-2 rounded bg-brand px-2 py-1 text-brand-foreground">
					<h2 className="w-fit text-start text-xs font-medium uppercase tracking-wide">{groupName}</h2>
				</div>
			</div>

			<div className="px-4 flex flex-col gap-2">
				{products.map((product) => (
					<ProductCard key={product.id} product={product} variant="full" />
				))}
			</div>
		</section>
	);
}
