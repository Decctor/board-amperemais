"use client";

import DeleteRowButton from "@/components/Spreadsheet/DeleteRowButton";
import EditableNumberCell from "@/components/Spreadsheet/EditableNumberCell";
import MobileEditableField from "@/components/Spreadsheet/MobileEditableField";
import { Button } from "@/components/ui/button";
import { formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import type { TSalesChannelShowcaseProduct } from "@/lib/queries/sales-channels";
import { SPREADSHEET_TABLE_ATTR, type SpreadsheetGridBounds } from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import { Box, RotateCcw, SquarePen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

// Só o preço é editável, então a grade de navegação tem uma coluna: as setas do teclado andam
// entre as linhas da mesma célula, que é o movimento que faz sentido aqui.
const SHOWCASE_PRICE_COL = 0;
const SHOWCASE_GRID_COL_COUNT = 1;

const SHOWCASE_TABLE_GRID =
	"grid-cols-[minmax(0,30fr)_minmax(0,15fr)_minmax(0,12fr)_minmax(0,15fr)_minmax(0,13fr)_minmax(5rem,8fr)]";
const SHOWCASE_DESKTOP_ROW = cn("hidden w-full lg:grid", SHOWCASE_TABLE_GRID, "items-center gap-x-1 px-2");

/** Abre o produto já na aba de cadastro — a vitrine só cura preço e presença; o resto é lá. */
function ProductRegistryLink({ produto }: { produto: TSalesChannelShowcaseProduct }) {
	return (
		<Button asChild type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
			<Link href={`/dashboard/catalog/products/${produto.id}?tab=cadastro`} aria-label={`Abrir o cadastro de ${produto.nome}`} title="Abrir o cadastro do produto">
				<SquarePen className="h-4 w-4" />
			</Link>
		</Button>
	);
}

function ProductThumb({ imageUrl, label }: { imageUrl?: string | null; label: string }) {
	if (imageUrl) {
		return (
			<span className="relative block h-6 w-6 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
				<Image src={imageUrl} alt={label} fill className="object-cover" />
			</span>
		);
	}
	if (label) {
		return (
			<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[0.62rem] font-semibold text-muted-foreground">
				{formatNameAsInitials(label)}
			</span>
		);
	}
	return (
		<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/50 text-muted-foreground">
			<Box className="h-3.5 w-3.5" />
		</span>
	);
}

/**
 * Alertas do que a loja vai esconder mesmo com o produto na vitrine: sem preço resolvido e sem
 * saldo são exatamente os dois portões de `getShopCatalogProducts`. Aparecem aqui para que a
 * ausência do produto na loja tenha explicação na própria tela onde ele foi incluído.
 */
function ProductStatus({ produto }: { produto: TSalesChannelShowcaseProduct }) {
	const semPreco = !produto.temVariantes && (produto.precoVendaCanal ?? produto.precoVenda ?? 0) <= 0;
	const semEstoque = !!produto.rastreamentoEstoqueAtivo && (produto.quantidade ?? 0) <= 0;

	if (!semPreco && !semEstoque) return <span className="text-[0.65rem] text-muted-foreground">Na loja</span>;

	return (
		<span className="flex flex-wrap items-center gap-1">
			{semPreco ? (
				<span
					title="Sem preço de venda, a loja não exibe o produto."
					className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-500"
				>
					Sem preço
				</span>
			) : null}
			{semEstoque ? (
				<span
					title="Estoque rastreado e zerado: a loja esconde o produto até haver saldo."
					className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-500"
				>
					Sem estoque
				</span>
			) : null}
		</span>
	);
}

function ShowcasePriceCell({
	produto,
	gridRow,
	gridBounds,
	onUpdatePrice,
}: {
	produto: TSalesChannelShowcaseProduct;
	gridRow: number;
	gridBounds: SpreadsheetGridBounds;
	onUpdatePrice: (precoVenda: number | null) => void;
}) {
	if (produto.temVariantes) {
		return (
			<span className="block px-1 text-center text-[0.65rem] text-muted-foreground" title="Produto com variantes: o preço na loja é definido em cada variante, no cadastro do produto.">
				Por variante
			</span>
		);
	}

	const overridden = produto.precoVendaCanal != null;
	return (
		<div
			className={cn(
				"flex min-w-0 items-center gap-1 rounded-md border px-1",
				overridden ? "border-blue-500/40 bg-blue-500/10" : "border-transparent",
			)}
		>
			<div className="min-w-0 flex-1">
				<EditableNumberCell
					value={produto.precoVendaCanal ?? 0}
					ariaLabel={`Editar preço na loja de ${produto.nome}`}
					min={0}
					gridRow={gridRow}
					gridCol={SHOWCASE_PRICE_COL}
					gridBounds={gridBounds}
					// Zero é a forma de limpar: um preço zerado seria escondido pela loja de qualquer
					// jeito, então vale mais como "volta a herdar" do que como valor.
					format={(value) => (value > 0 ? formatToMoney(value) : "Herda")}
					onCommit={(value) => onUpdatePrice(value > 0 ? value : null)}
				/>
			</div>
			{overridden ? (
				<button
					type="button"
					onClick={() => onUpdatePrice(null)}
					aria-label={`Voltar a herdar o preço de ${produto.nome}`}
					className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<RotateCcw className="h-3 w-3" />
				</button>
			) : null}
		</div>
	);
}

type ShowcaseProductRowProps = {
	produto: TSalesChannelShowcaseProduct;
	gridRow: number;
	gridBounds: SpreadsheetGridBounds;
	onUpdatePrice: (precoVenda: number | null) => void;
	onRemove: () => void;
};

function ShowcaseProductRow({ produto, gridRow, gridBounds, onUpdatePrice, onRemove }: ShowcaseProductRowProps) {
	return (
		<div className={cn("border-t border-border", gridRow % 2 === 1 && "bg-muted/10")}>
			<div className={cn(SHOWCASE_DESKTOP_ROW, "min-h-11 py-1 text-xs transition-colors hover:bg-muted/40")}>
				<div className="flex min-w-0 items-center gap-2 px-1">
					<ProductThumb imageUrl={produto.imagemCapaUrl} label={produto.nome} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="truncate font-medium">{produto.nome}</span>
						{produto.codigo ? <span className="truncate text-[0.65rem] text-muted-foreground">{produto.codigo}</span> : null}
					</span>
				</div>
				<p className="min-w-0 truncate px-1 text-center text-muted-foreground">{produto.grupo.trim() || "—"}</p>
				<p className="min-w-0 px-1 text-center tabular-nums text-muted-foreground">
					{produto.precoVenda && produto.precoVenda > 0 ? formatToMoney(produto.precoVenda) : "-"}
				</p>
				<div className="min-w-0 px-1">
					<ShowcasePriceCell produto={produto} gridRow={gridRow} gridBounds={gridBounds} onUpdatePrice={onUpdatePrice} />
				</div>
				<div className="flex min-w-0 justify-center px-1">
					<ProductStatus produto={produto} />
				</div>
				<div className="flex items-center justify-center gap-0.5 px-1">
					<ProductRegistryLink produto={produto} />
					<DeleteRowButton onRemove={onRemove} ariaLabel={`Remover ${produto.nome} da vitrine`} />
				</div>
			</div>

			<div className="flex flex-col gap-2 px-3 py-2.5 lg:hidden">
				<div className="flex items-start justify-between gap-2">
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<ProductThumb imageUrl={produto.imagemCapaUrl} label={produto.nome} />
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-sm font-medium">{produto.nome}</span>
							{produto.codigo ? <span className="truncate text-[0.65rem] text-muted-foreground">{produto.codigo}</span> : null}
						</span>
					</div>
					<div className="flex shrink-0 items-center gap-0.5">
						<ProductRegistryLink produto={produto} />
						<DeleteRowButton onRemove={onRemove} ariaLabel={`Remover ${produto.nome} da vitrine`} />
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<MobileEditableField label="Preço base">
						<span className="px-1 text-xs tabular-nums text-muted-foreground">
							{produto.precoVenda && produto.precoVenda > 0 ? formatToMoney(produto.precoVenda) : "-"}
						</span>
					</MobileEditableField>
					<MobileEditableField label="Preço na loja">
						<ShowcasePriceCell produto={produto} gridRow={gridRow} gridBounds={gridBounds} onUpdatePrice={onUpdatePrice} />
					</MobileEditableField>
				</div>
				<ProductStatus produto={produto} />
			</div>
		</div>
	);
}

type ShowcaseProductTableProps = {
	produtos: TSalesChannelShowcaseProduct[];
	updateProductPrice: (produtoId: string, precoVenda: number | null) => void;
	removeProduct: (produtoId: string) => void;
};

export default function ShowcaseProductTable({ produtos, updateProductPrice, removeProduct }: ShowcaseProductTableProps) {
	const gridBounds: SpreadsheetGridBounds = useMemo(
		() => ({ rowCount: produtos.length, colCount: SHOWCASE_GRID_COL_COUNT }),
		[produtos.length],
	);

	return (
		<div {...{ [SPREADSHEET_TABLE_ATTR]: "true" }} className="flex w-full flex-col">
			<div
				className={cn(
					SHOWCASE_DESKTOP_ROW,
					"min-h-8 border-b border-border bg-background py-1.5 text-[0.68rem] font-medium uppercase text-muted-foreground",
				)}
			>
				<p className="min-w-0 px-1 text-start">Produto</p>
				<p className="min-w-0 px-1 text-center">Grupo</p>
				<p className="min-w-0 px-1 text-center">Preço base</p>
				<p className="min-w-0 px-1 text-center">Preço na loja</p>
				<p className="min-w-0 px-1 text-center">Status</p>
				<p className="min-w-0 px-1 text-center">Ações</p>
			</div>

			<div className="flex w-full flex-col bg-background">
				{produtos.map((produto, rowIndex) => (
					<ShowcaseProductRow
						key={produto.id}
						produto={produto}
						gridRow={rowIndex}
						gridBounds={gridBounds}
						onUpdatePrice={(precoVenda) => updateProductPrice(produto.id, precoVenda)}
						onRemove={() => removeProduct(produto.id)}
					/>
				))}
			</div>
		</div>
	);
}
