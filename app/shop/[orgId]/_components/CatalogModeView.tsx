"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { normalizeForSearch } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import FeaturedSection from "./FeaturedSection";
import MostOrderedSection from "./MostOrderedSection";
import ProductCard from "./ProductCard";
import { useShop } from "./ShopProvider";

export default function CatalogModeView() {
	const { catalog } = useShop();
	const { products, blocks, groups } = catalog;

	const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
	const [searchValue, setSearchValue] = useState("");

	const filteredProducts = useMemo(() => {
		let filtered = products;

		if (searchValue.trim()) {
			const search = normalizeForSearch(searchValue);
			filtered = filtered.filter(
				(p) =>
					normalizeForSearch(p.nome).includes(search) ||
					(p.codigo && normalizeForSearch(p.codigo).includes(search)) ||
					(p.grupo && normalizeForSearch(p.grupo).includes(search)),
			);
		}

		if (selectedGroup) {
			filtered = filtered.filter((p) => p.grupo === selectedGroup);
		}

		return filtered;
	}, [products, searchValue, selectedGroup]);

	const isFiltering = searchValue.trim().length > 0 || selectedGroup !== null;

	const featuredBlock = blocks.find((b) => b.tipo === "EM_DESTAQUE");
	const mostOrderedBlock = blocks.find((b) => b.tipo === "MAIS_PEDIDOS");

	return (
		<div className="flex flex-col">
			<div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
				<div className="px-4 py-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							id="shop-catalog-search-input"
							placeholder="Buscar produtos..."
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
							className="pl-9 pr-9 h-10 rounded-full bg-muted/50"
						/>
						{searchValue && (
							<Button
								variant="ghost"
								size="icon"
								className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
								onClick={() => setSearchValue("")}
							>
								<X className="w-3 h-3" />
							</Button>
						)}
					</div>
				</div>

				{groups.length > 0 && (
					<ScrollArea className="w-full">
						<div className="flex gap-2 px-4 pb-3">
							<Button
								variant={selectedGroup === null ? "brand" : "outline"}
								size="sm"
								className="rounded-full flex-shrink-0 h-8 text-xs font-semibold"
								onClick={() => setSelectedGroup(null)}
							>
								Todos
							</Button>
							{groups.map((group) => (
								<Button
									key={group}
									variant={selectedGroup === group ? "brand" : "outline"}
									size="sm"
									className={cn("rounded-full flex-shrink-0 h-8 text-xs font-semibold", selectedGroup === group && "bg-brand text-brand-foreground")}
									onClick={() => setSelectedGroup(group)}
								>
									{group}
								</Button>
							))}
						</div>
						<ScrollBar orientation="horizontal" className="invisible" />
					</ScrollArea>
				)}
			</div>

			{!isFiltering && (
				<>
					{featuredBlock && featuredBlock.produtos.length > 0 && <FeaturedSection products={featuredBlock.produtos} />}

					{mostOrderedBlock && mostOrderedBlock.produtos.length > 0 && <MostOrderedSection products={mostOrderedBlock.produtos} />}
				</>
			)}

			<section className="py-4">
				<div className="px-4 mb-3">
					<h2 className="font-black text-sm uppercase tracking-wide">{selectedGroup || "Todos os produtos"}</h2>
				</div>

				<div className="px-4 grid grid-cols-2 md:grid-cols-3 gap-3">
					{filteredProducts.map((product) => (
						<div key={product.id} className="w-full">
							<ProductCard product={product} variant="full" />
						</div>
					))}
				</div>

				{filteredProducts.length === 0 && (
					<div className="py-12 text-center">
						<p className="text-muted-foreground">Nenhum produto encontrado.</p>
					</div>
				)}
			</section>
		</div>
	);
}
