"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { normalizeForSearch } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import FeaturedSection from "./FeaturedSection";
import MostOrderedSection from "./MostOrderedSection";
import ProductGroupSection from "./ProductGroupSection";
import { useShop } from "./ShopProvider";

function slugify(str: string) {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export default function MenuModeView() {
	const { catalog } = useShop();
	const { products, blocks, groups, organization } = catalog;
	const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
	const [searchValue, setSearchValue] = useState("");
	const [isSearchStuck, setIsSearchStuck] = useState(false);
	const stickySentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const sentinel = stickySentinelRef.current;
		if (!sentinel) return;
		if (typeof IntersectionObserver === "undefined") return;

		const observer = new IntersectionObserver(([entry]) => setIsSearchStuck(!entry.isIntersecting), { threshold: 0 });
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, []);

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

	const productsByGroup = useMemo(() => {
		const grouped: Record<string, typeof products> = {};
		for (const group of groups) {
			grouped[group] = filteredProducts.filter((p) => p.grupo === group);
		}
		const ungrouped = filteredProducts.filter((p) => !p.grupo || !groups.includes(p.grupo));
		if (ungrouped.length > 0) {
			grouped["Outros"] = ungrouped;
		}
		return grouped;
	}, [filteredProducts, groups]);

	const isFiltering = searchValue.trim().length > 0 || selectedGroup !== null;

	const handleGroupClick = (group: string) => {
		if (selectedGroup === group) {
			setSelectedGroup(null);
			return;
		}
		setSelectedGroup(group);
		const element = document.getElementById(`group-${slugify(group)}`);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const featuredBlock = blocks.find((b) => b.tipo === "EM_DESTAQUE");
	const mostOrderedBlock = blocks.find((b) => b.tipo === "MAIS_PEDIDOS");
	const groupsBlock = blocks.find((b) => b.tipo === "GRUPOS_PRODUTOS");

	return (
		<div className="flex flex-col">
			<div ref={stickySentinelRef} className="h-px w-full" aria-hidden />
			<div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
				<div className="px-4 py-3">
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"shrink-0 overflow-hidden transition-all duration-200",
								isSearchStuck ? "w-10 opacity-100" : "w-0 opacity-0",
							)}
						>
							{organization.logoUrl ? (
								<div className="relative size-10 overflow-hidden rounded-full border border-border bg-background">
									<Image src={organization.logoUrl} alt={organization.nome} fill className="object-cover" sizes="40px" />
								</div>
							) : (
								<div className="flex size-10 items-center justify-center rounded-full border border-border bg-brand text-brand-foreground">
									<span className="text-sm font-black">{organization.nome.charAt(0).toUpperCase()}</span>
								</div>
							)}
						</div>

						<div className="relative min-w-0 flex-1">
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
				</div>

				{groups.length > 0 && (
					<ScrollArea className="w-full">
						<div className="flex gap-2 px-4 pb-3">
							{groups.map((group) => (
								<Button
									key={group}
									variant={selectedGroup === group ? "default" : "outline"}
									size="sm"
									className={cn(
										"rounded-full flex-shrink-0 h-8 text-xs font-semibold",
										selectedGroup === group && "bg-primary text-primary-foreground",
									)}
									onClick={() => handleGroupClick(group)}
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
					{featuredBlock && featuredBlock.produtos.length > 0 && (
						<FeaturedSection products={featuredBlock.produtos} />
					)}

					{mostOrderedBlock && mostOrderedBlock.produtos.length > 0 && (
						<MostOrderedSection products={mostOrderedBlock.produtos} />
					)}
				</>
			)}

			{groupsBlock && (
				<div className="flex flex-col">
					{Object.entries(productsByGroup).map(([group, groupProducts]) => (
						<ProductGroupSection
							key={group}
							groupName={group}
							products={groupProducts}
							id={`group-${slugify(group)}`}
						/>
					))}
				</div>
			)}

			{filteredProducts.length === 0 && (
				<div className="py-12 text-center">
					<p className="text-muted-foreground">Nenhum produto encontrado.</p>
				</div>
			)}
		</div>
	);
}
