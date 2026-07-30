"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import type { TIfoodCategoryDTO, TIfoodItemDTO } from "@/lib/integrations/ifood/catalog-types";
import { patchIfoodItem } from "@/lib/mutations/ifood";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Check, ImageIcon, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function getItemStatusConfig(status: string | null) {
	if (status?.toUpperCase() === "AVAILABLE") return { label: "DISPONÍVEL", className: "bg-emerald-500/15 text-emerald-600" };
	if (status?.toUpperCase() === "UNAVAILABLE") return { label: "INDISPONÍVEL", className: "bg-red-500/15 text-red-600" };
	return { label: status ?? "—", className: "bg-muted text-muted-foreground" };
}

type ItemRowProps = {
	merchantId: string;
	item: TIfoodItemDTO;
	canManage: boolean;
	onChanged: () => void;
};

function ItemRow({ merchantId, item, canManage, onChanged }: ItemRowProps) {
	const statusConfig = getItemStatusConfig(item.status);
	const isAvailable = item.status?.toUpperCase() === "AVAILABLE";
	const [priceEditIsOpen, setPriceEditIsOpen] = useState(false);
	const [priceDraft, setPriceDraft] = useState(item.preco != null ? String(item.preco).replace(".", ",") : "");

	const { mutate: patchItem, isPending } = useMutation({
		mutationKey: ["patch-ifood-item", merchantId, item.id],
		mutationFn: patchIfoodItem,
		onSuccess: (data) => {
			toast.success(data.message);
			setPriceEditIsOpen(false);
			onChanged();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	function handlePriceSave() {
		const parsed = Number(priceDraft.replace(",", "."));
		if (!Number.isFinite(parsed) || parsed < 0) return toast.error("Preço inválido.");
		if (!item.id) return toast.error("Item sem identificador no iFood.");
		patchItem({ merchantId, itemId: item.id, patch: { preco: parsed } });
	}

	function handleStatusToggle() {
		if (!item.id) return toast.error("Item sem identificador no iFood.");
		patchItem({ merchantId, itemId: item.id, patch: { status: isAvailable ? "UNAVAILABLE" : "AVAILABLE" } });
	}

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
			<div className="flex shrink-0 items-center gap-2">
				{priceEditIsOpen ? (
					<div className="flex items-center gap-1">
						<Input
							value={priceDraft}
							onChange={(e) => setPriceDraft(e.target.value)}
							className="h-8 w-[90px] text-right text-sm"
							inputMode="decimal"
							autoFocus
						/>
						<Button variant="ghost" size="sm" disabled={isPending} onClick={handlePriceSave} title="Salvar preço">
							<Check className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="sm" onClick={() => setPriceEditIsOpen(false)} title="Cancelar">
							<X className="h-4 w-4" />
						</Button>
					</div>
				) : (
					<>
						<span className="text-sm font-bold tabular-nums text-foreground">{item.preco != null ? formatToMoney(item.preco) : "—"}</span>
						{canManage ? (
							<Button variant="ghost" size="sm" onClick={() => setPriceEditIsOpen(true)} title="Editar preço">
								<Pencil className="h-3.5 w-3.5" />
							</Button>
						) : null}
					</>
				)}
				{canManage ? (
					<button
						type="button"
						disabled={isPending}
						onClick={handleStatusToggle}
						className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold transition-opacity hover:opacity-70", statusConfig.className)}
						title={isAvailable ? "Pausar item no iFood" : "Reativar item no iFood"}
					>
						{statusConfig.label}
					</button>
				) : (
					<span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", statusConfig.className)}>{statusConfig.label}</span>
				)}
			</div>
		</div>
	);
}

type CategoryCardProps = {
	merchantId: string;
	category: TIfoodCategoryDTO;
	canManage: boolean;
	onEdit: () => void;
	onAddProduct: () => void;
	onChanged: () => void;
};

/** Card de uma categoria do catálogo com seus itens e ações de gestão. */
export function CategoryCard({ merchantId, category, canManage, onEdit, onAddProduct, onChanged }: CategoryCardProps) {
	const isPaused = category.status?.toUpperCase() === "UNAVAILABLE";
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
			<div className="flex w-full items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-bold tracking-tight">{category.nome ?? "Categoria sem nome"}</h3>
					<span className="text-xs text-muted-foreground">
						{category.itens.length} {category.itens.length === 1 ? "item" : "itens"}
					</span>
					{isPaused ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-red-600">PAUSADA</span> : null}
				</div>
				{canManage ? (
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="sm" onClick={onAddProduct} title="Adicionar produto nesta categoria">
							<Plus className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="sm" onClick={onEdit} title="Editar categoria">
							<Pencil className="h-4 w-4" />
						</Button>
					</div>
				) : null}
			</div>
			{category.itens.length === 0 ? (
				<p className="py-2 text-center text-xs text-muted-foreground">Nenhum item nesta categoria.</p>
			) : (
				<div className="flex w-full flex-col gap-1.5">
					{category.itens.map((item, index) => (
						<ItemRow key={item.id ?? index} merchantId={merchantId} item={item} canManage={canManage} onChanged={onChanged} />
					))}
				</div>
			)}
		</div>
	);
}
