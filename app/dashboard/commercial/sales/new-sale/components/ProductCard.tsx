import { Badge } from "@/components/ui/badge";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TGetPOSProductsOutput } from "@/app/api/pos/products/route";
import { Package, PackagePlus } from "lucide-react";
import Image from "next/image";
import { memo } from "react";

type Product = TGetPOSProductsOutput["data"]["products"][number];

type ProductCardProps = {
	product: Product;
	onSelect: (product: Product) => void;
};

// Preço a exibir: "A partir de" quando há variantes (menor preço), senão o preço base.
function getDisplayPrice(product: Product) {
	if (product.variantes.length > 0) {
		return { type: "starting-from" as const, value: Math.min(...product.variantes.map((v) => v.precoVenda)) };
	}
	return { type: "fixed" as const, value: product.precoVenda ?? 0 };
}

function ProductCard({ product, onSelect }: ProductCardProps) {
	const hasVariants = product.variantes.length > 0;
	const hasAddOns = product.addOnsReferencias.length > 0;
	const isComplex = hasVariants || hasAddOns;
	const displayPrice = getDisplayPrice(product);
	const hasStock = product.quantidade !== null && product.quantidade !== undefined;

	return (
		<button
			type="button"
			onClick={() => onSelect(product)}
			className={cn(
				"group relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-2xs",
				"transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
			)}
		>
			{/* Imagem — proporção fixa mantém todos os cards alinhados */}
			<div className="relative aspect-square w-full overflow-hidden bg-secondary/40">
				{product.imagemCapaUrl ? (
					<Image src={product.imagemCapaUrl} alt={product.nome} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<Package className="h-10 w-10 text-muted-foreground/40" />
					</div>
				)}

				{isComplex ? (
					<Badge className="absolute right-2 top-2 z-10 gap-1 bg-brand-secondary text-[0.6rem] font-bold text-brand-secondary-foreground shadow-sm">
						<PackagePlus className="h-3 w-3" />
						{hasVariants && hasAddOns ? "VAR + ADD" : hasVariants ? "VARIANTES" : "ADICIONAIS"}
					</Badge>
				) : null}
			</div>

			{/* Corpo — nome reserva 2 linhas, preço fixado na base via mt-auto */}
			<div className="flex flex-1 flex-col gap-2 p-3">
				<div className="flex flex-col gap-0.5">
					<h3 className="line-clamp-2 min-h-[2.25rem] text-sm font-bold leading-tight tracking-tight">{product.nome}</h3>
					<p className="truncate text-[0.65rem] font-medium text-muted-foreground">{product.codigo}</p>
				</div>

				<div className="mt-auto flex flex-col gap-1.5">
					<div className="flex flex-col gap-0.5">
						{displayPrice.type === "starting-from" ? (
							<span className="text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground">A partir de</span>
						) : null}
						<p className="text-lg font-black tabular-nums text-foreground">{formatToMoney(displayPrice.value)}</p>
					</div>

					{hasStock ? (
						<div className="flex items-center gap-1.5">
							<span
								className={cn("h-2 w-2 rounded-full", {
									"bg-red-500": product.quantidade === 0,
									"bg-yellow-500": product.quantidade! > 0 && product.quantidade! <= 10,
									"bg-green-500": product.quantidade! > 10,
								})}
							/>
							<span className="text-[0.65rem] font-medium text-muted-foreground">
								{product.quantidade! > 0 ? `${product.quantidade} un.` : "SEM ESTOQUE"}
							</span>
						</div>
					) : null}
				</div>
			</div>
		</button>
	);
}

export default memo(ProductCard);
