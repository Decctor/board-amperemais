"use client";

import { cn } from "@/lib/utils";
import { formatToMoney } from "@/lib/formatting";
import type { TIfoodCategoryDTO, TIfoodItemDTO } from "@/lib/integrations/ifood/catalog-types";
import { ImageIcon } from "lucide-react";

function getItemStatusConfig(status: string | null) {
	if (status?.toUpperCase() === "AVAILABLE") return { label: "DISPONÍVEL", className: "bg-emerald-500/15 text-emerald-600" };
	if (status?.toUpperCase() === "UNAVAILABLE") return { label: "INDISPONÍVEL", className: "bg-red-500/15 text-red-600" };
	return { label: status ?? "—", className: "bg-muted text-muted-foreground" };
}

type ItemRowProps = {
	item: TIfoodItemDTO;
};

function ItemRow({ item }: ItemRowProps) {
	const statusConfig = getItemStatusConfig(item.status);
	return (
		<div className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-2.5 py-2">
			{item.imagemUrl ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={item.imagemUrl} alt={item.nome ?? "Item"} className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border" />
			) : (
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
					<ImageIcon className="h-4 w-4" />
				</div>
			)}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm font-medium text-foreground">{item.nome ?? "Item sem nome"}</span>
				{item.descricao ? <span className="truncate text-xs text-muted-foreground">{item.descricao}</span> : null}
			</div>
			<div className="flex shrink-0 items-center gap-3">
				<span className="text-sm font-bold tabular-nums text-foreground">{item.preco != null ? formatToMoney(item.preco) : "—"}</span>
				<span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", statusConfig.className)}>{statusConfig.label}</span>
			</div>
		</div>
	);
}

type CategoryCardProps = {
	category: TIfoodCategoryDTO;
};

/** Card de uma categoria do catálogo com seus itens (leitura). */
export function CategoryCard({ category }: CategoryCardProps) {
	const isPaused = category.status?.toUpperCase() === "UNAVAILABLE";
	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex w-full items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-bold tracking-tight">{category.nome ?? "Categoria sem nome"}</h3>
					<span className="text-xs text-muted-foreground">
						{category.itens.length} {category.itens.length === 1 ? "item" : "itens"}
					</span>
				</div>
				{isPaused ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-red-600">PAUSADA</span> : null}
			</div>
			{category.itens.length === 0 ? (
				<p className="py-2 text-center text-xs text-muted-foreground">Nenhum item nesta categoria.</p>
			) : (
				<div className="flex w-full flex-col gap-1.5">
					{category.itens.map((item, index) => (
						<ItemRow key={item.id ?? index} item={item} />
					))}
				</div>
			)}
		</div>
	);
}
