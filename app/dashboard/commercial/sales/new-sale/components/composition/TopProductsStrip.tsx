"use client";

import { formatToMoney } from "@/lib/formatting";
import { usePOSTopProducts } from "@/lib/queries/pos";
import type { TGetPOSTopProductsOutput } from "@/app/api/pos/top-products/route";
import { Flame, Package, PackagePlus } from "lucide-react";
import Image from "next/image";
import { memo } from "react";

type TopProduct = TGetPOSTopProductsOutput["data"]["products"][number];

type TopProductsStripProps = {
	onProductClick: (product: TopProduct) => void;
};

// Preço a exibir: menor preço quando há variantes ("a partir de"), senão o preço base.
function getDisplayPrice(product: TopProduct) {
	if (product.variantes.length > 0) {
		return { startingFrom: true, value: Math.min(...product.variantes.map((variant) => variant.precoVenda)) };
	}
	return { startingFrom: false, value: product.precoVenda ?? 0 };
}

function TopProductTile({ product, onSelect }: { product: TopProduct; onSelect: (product: TopProduct) => void }) {
	const isComplex = product.variantes.length > 0 || product.addOnsReferencias.length > 0;
	const displayPrice = getDisplayPrice(product);

	return (
		<button
			type="button"
			onClick={() => onSelect(product)}
			title={product.nome}
			className="group flex w-[15rem] min-w-[15rem] snap-start flex-row gap-2 rounded-xl border border-border bg-card p-1.5 text-left shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-[6.5rem] sm:min-w-[6.5rem] sm:flex-col sm:gap-1"
		>
			<div className="relative h-[3.5rem] w-[3.5rem] min-h-[3.5rem] min-w-[3.5rem] overflow-hidden rounded-lg bg-secondary/40 sm:aspect-square sm:h-auto sm:min-h-0 sm:w-full sm:min-w-0">
				{product.imagemCapaUrl ? (
					<Image src={product.imagemCapaUrl} alt={product.nome} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
				) : (
					<div className="flex h-full w-full items-center justify-center">
					<Package className="h-5 w-5 text-muted-foreground/40 sm:h-6 sm:w-6" />
					</div>
				)}
				{isComplex ? (
					<span className="absolute right-1 top-1 rounded-md bg-brand-secondary p-0.5 text-brand-secondary-foreground shadow-sm">
						<PackagePlus className="h-3 w-3" />
					</span>
				) : null}
			</div>
			<div className="flex min-w-0 flex-1 flex-col justify-between px-0.5 py-1 sm:flex-none sm:justify-start sm:pb-0.5 sm:pt-0">
				<span className="line-clamp-2 text-xs font-medium leading-tight text-muted-foreground sm:line-clamp-1 sm:text-[0.65rem]">{product.nome}</span>
				<span className="text-sm font-black tabular-nums leading-tight text-foreground">
					{displayPrice.startingFrom ? <span className="mr-0.5 text-[0.55rem] font-bold uppercase text-muted-foreground">a partir</span> : null}
					{formatToMoney(displayPrice.value)}
				</span>
			</div>
		</button>
	);
}

/**
 * Faixa de acesso rápido do PDV: os itens mais vendidos dos últimos 90 dias, em um toque.
 * Some silenciosamente quando não há histórico ou em erro — a grade abaixo é o fallback natural.
 */
function TopProductsStrip({ onProductClick }: TopProductsStripProps) {
	const { data, isLoading, isError } = usePOSTopProducts();
	const products = data?.products ?? [];

	if (isError) return null;
	if (!isLoading && products.length === 0) return null;

	return (
		<div className="flex w-full flex-col gap-1.5">
			<div className="flex items-center gap-1.5">
				<Flame className="h-3.5 w-3.5 min-h-3.5 min-w-3.5 text-brand" />
				<h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Mais pedidos</h2>
			</div>
			<div className="flex w-full snap-x snap-proximity gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
				{isLoading
					? Array.from({ length: 6 }, (_, index) => (
							<div
								key={index}
								className="flex w-[15rem] min-w-[15rem] animate-pulse gap-2 rounded-xl border border-border bg-card p-1.5 sm:block sm:w-[6.5rem] sm:min-w-[6.5rem]"
							>
								<div className="h-[3.75rem] w-[3.75rem] min-w-[3.75rem] rounded-lg bg-secondary/60 sm:aspect-square sm:h-auto sm:w-full sm:min-w-0" />
								<div className="flex min-w-0 flex-1 flex-col justify-between py-1 sm:block sm:py-0">
									<div className="h-2.5 w-4/5 rounded bg-secondary/60 sm:mt-1.5 sm:w-3/4" />
									<div className="h-3.5 w-1/2 rounded bg-secondary/60 sm:mt-1" />
								</div>
							</div>
						))
					: products.map((product) => <TopProductTile key={product.id} product={product} onSelect={onProductClick} />)}
			</div>
		</div>
	);
}

export default memo(TopProductsStrip);
