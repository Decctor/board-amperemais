"use client";

import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useShop } from "./ShopProvider";

type ProductCardProps = {
	product: TShopCatalogProduct;
	variant?: "compact" | "full";
};

export default function ProductCard({ product, variant = "compact" }: ProductCardProps) {
	const { setBuilderProduct, orderState } = useShop();

	const hasVariants = product.variantes.length > 0;
	const hasAddOns = product.addOnsReferencias.length > 0;
	const isComplex = hasVariants || hasAddOns;

	const lowestPrice = hasVariants ? Math.min(...product.variantes.map((v) => v.precoVenda ?? 0)) : (product.precoVenda ?? 0);

	const handleClick = () => {
		if (isComplex) {
			setBuilderProduct(product);
			return;
		}

		orderState.addItem({
			tempId: crypto.randomUUID(),
			produtoId: product.id,
			produtoVarianteId: null,
			quantidade: 1,
			modificadores: [],
		});
	};

	if (variant === "full") {
		return (
			<div className="group flex gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={handleClick}>
				{product.imagemCapaUrl ? (
					<div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
						<Image src={product.imagemCapaUrl} alt={product.descricao} fill className="object-cover" />
					</div>
				) : (
					<div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
						<span className="text-2xl font-black text-muted-foreground/50">{product.descricao.charAt(0).toUpperCase()}</span>
					</div>
				)}

				<div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
					<div>
						<h3 className="font-semibold text-sm line-clamp-2">{product.descricao}</h3>
						{product.grupo && <p className="text-xs text-muted-foreground mt-0.5">{product.grupo}</p>}
					</div>

					<div className="flex items-center justify-between gap-2 mt-2">
						<span className="font-black text-primary">
							{hasVariants && "a partir de "}
							{formatToMoney(lowestPrice)}
						</span>
						<Button
							size="icon"
							variant="brand"
							className="h-8 w-8 rounded-full"
							onClick={(e) => {
								e.stopPropagation();
								handleClick();
							}}
						>
							<Plus className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"group flex flex-col rounded-xl border bg-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
				"w-[140px] sm:w-[160px] flex-shrink-0",
			)}
			onClick={handleClick}
		>
			{product.imagemCapaUrl ? (
				<div className="relative w-full aspect-square bg-muted">
					<Image src={product.imagemCapaUrl} alt={product.descricao} fill className="object-cover" />
				</div>
			) : (
				<div className="w-full aspect-square bg-muted flex items-center justify-center">
					<span className="text-3xl font-black text-muted-foreground/50">{product.descricao.charAt(0).toUpperCase()}</span>
				</div>
			)}

			<div className="p-2.5 flex flex-col gap-1">
				<h3 className="font-semibold text-xs line-clamp-2 leading-tight">{product.descricao}</h3>
				<span className="font-black text-sm text-primary">
					{hasVariants && "a partir de "}
					{formatToMoney(lowestPrice)}
				</span>
			</div>
		</div>
	);
}
