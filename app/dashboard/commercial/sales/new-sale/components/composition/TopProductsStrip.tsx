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
			className="group flex w-[6.5rem] min-w-[6.5rem] snap-start flex-col gap-1 rounded-xl border border-border bg-card p-1.5 text-left shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
		>
			<div className="relative aspect-square w-full overflow-hidden rounded-lg bg-secondary/40">
				{product.imagemCapaUrl ? (
					<Image src={product.imagemCapaUrl} alt={product.nome} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<Package className="h-6 w-6 text-muted-foreground/40" />
					</div>
				)}
				{isComplex ? (
					<span className="absolute right-1 top-1 rounded-md bg-brand-secondary p-0.5 text-brand-secondary-foreground shadow-sm">
						<PackagePlus className="h-3 w-3" />
					</span>
				) : null}
			</div>
			<div className="flex flex-col px-0.5 pb-0.5">
				<span className="truncate text-[0.65rem] font-medium leading-tight text-muted-foreground">{product.nome}</span>
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
							<div key={index} className="w-[6.5rem] min-w-[6.5rem] animate-pulse rounded-xl border border-border bg-card p-1.5">
								<div className="aspect-square w-full rounded-lg bg-secondary/60" />
								<div className="mt-1.5 h-2.5 w-3/4 rounded bg-secondary/60" />
								<div className="mt-1 h-3.5 w-1/2 rounded bg-secondary/60" />
							</div>
						))
					: products.map((product) => <TopProductTile key={product.id} product={product} onSelect={onProductClick} />)}
			</div>
		</div>
	);
}

export default memo(TopProductsStrip);
