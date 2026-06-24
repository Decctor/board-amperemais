import SelectProductWithVariants, { type TSelectProductWithVariantsValue } from "@/components/Inputs/SelectProductWithVariants";
import DeleteRowButton from "@/components/Spreadsheet/DeleteRowButton";
import EditableNumberCell from "@/components/Spreadsheet/EditableNumberCell";
import MobileEditableField from "@/components/Spreadsheet/MobileEditableField";
import SpreadsheetCellWrapper from "@/components/Spreadsheet/SpreadsheetCellWrapper";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import {
	consumeProgrammaticSpreadsheetFocus,
	handleSpreadsheetNavigationKeyDown,
	SPREADSHEET_TABLE_ATTR,
	type SpreadsheetGridBounds,
} from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import { TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import { BadgeDollarSign, BoxIcon, Plus, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

const PURCHASE_ITEM_GRID_COL = {
	PRODUCT: 0,
	QUANTITY: 1,
	UNIT_PRICE: 2,
	DISCOUNT: 3,
	SURCHARGE: 4,
} as const;

const PURCHASE_ITEM_GRID_COL_COUNT = 5;

type PurchaseItemsBlockProps = {
	purchaseItems: TUsePurchaseState["state"]["purchaseItems"];
	addPurchaseItem: TUsePurchaseState["addPurchaseItem"];
	updatePurchaseItem: TUsePurchaseState["updatePurchaseItem"];
	removePurchaseItem: TUsePurchaseState["removePurchaseItem"];
};

type TPurchaseItemState = TUsePurchaseState["state"]["purchaseItems"][number];

export default function PurchaseItemsBlock({ purchaseItems, addPurchaseItem, updatePurchaseItem, removePurchaseItem }: PurchaseItemsBlockProps) {
	const visibleItems = useMemo(() => purchaseItems.map((item, index) => ({ item, index })).filter(({ item }) => !item.deletar), [purchaseItems]);
	const purchaseTotal = visibleItems.reduce((acc, { item }) => acc + getItemTotal(item), 0);
	const gridBounds: SpreadsheetGridBounds = useMemo(
		() => ({
			rowCount: visibleItems.length + 1,
			colCount: PURCHASE_ITEM_GRID_COL_COUNT,
		}),
		[visibleItems.length],
	);

	return (
		<ResponsiveMenuSection title="ITENS" icon={<ShoppingCart className="h-4 min-h-4 w-4 min-w-4" />}>
			<div {...{ [SPREADSHEET_TABLE_ATTR]: "true" }} className="flex w-full flex-col overflow-hidden rounded-md border border-border bg-background">
				<div className="hidden min-h-9 w-full items-center border-b border-border bg-muted/60 px-2 py-1.5 text-[0.68rem] font-medium uppercase text-muted-foreground lg:flex">
					<p className="w-[30%] px-2 text-start">Produto</p>
					<p className="w-[9%] px-2 text-center">Un.</p>
					<p className="w-[9%] px-2 text-center">Qtde</p>
					<p className="w-[13%] px-2 text-center">Valor unit.</p>
					<p className="w-[11%] px-2 text-center">Desc.</p>
					<p className="w-[11%] px-2 text-center">Acrésc.</p>
					<p className="w-[12%] px-2 text-center">Total</p>
					<p className="w-[5%] px-2 text-center">Ações</p>
				</div>

				<div className="flex w-full flex-col bg-background">
					{visibleItems.map(({ item, index }, rowIndex) => (
						<PurchaseCompositionTableItem
							key={item.id ?? `${item.produtoId}-${item.produtoVarianteId ?? "produto"}-${index}`}
							item={item}
							gridRow={rowIndex}
							gridBounds={gridBounds}
							handleUpdate={(updatedItem) => updatePurchaseItem({ index, item: normalizeItemValues({ ...item, ...updatedItem }) })}
							handleRemove={() => removePurchaseItem({ index })}
						/>
					))}
					<DraftPurchaseCompositionItem addPurchaseItem={addPurchaseItem} gridRow={visibleItems.length} gridBounds={gridBounds} />
					{visibleItems.length > 0 ? (
						<div className="flex w-full items-center justify-center border-t border-border px-2 py-2">
							<div className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground/80 tabular-nums">
								<BadgeDollarSign size={15} />
								<p>Total da compra: {formatToMoney(purchaseTotal)}</p>
							</div>
						</div>
					) : (
						<div className="flex w-full items-center justify-center border-t border-border px-3 py-3">
							<p className="text-center text-xs font-medium tracking-tight text-muted-foreground">
								Selecione um produto na linha em branco para começar a compra.
							</p>
						</div>
					)}
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}

type PurchaseCompositionTableItemProps = {
	item: TPurchaseItemState;
	gridRow: number;
	gridBounds: SpreadsheetGridBounds;
	handleUpdate: (item: Partial<TPurchaseItemState>) => void;
	handleRemove: () => void;
};

function PurchaseCompositionTableItem({ item, gridRow, gridBounds, handleUpdate, handleRemove }: PurchaseCompositionTableItemProps) {
	const rowTotal = getItemTotal(item);

	return (
		<div className="border-t border-border first:border-t-0">
			<div className="hidden min-h-11 w-full items-center px-2 py-1 text-xs transition-colors hover:bg-muted/40 lg:flex">
				<div className="w-[30%] px-1">
					<ProductCell item={item} gridRow={gridRow} gridCol={PURCHASE_ITEM_GRID_COL.PRODUCT} gridBounds={gridBounds} onChange={handleUpdate} />
				</div>
				<p className="w-[9%] truncate px-2 text-center text-muted-foreground">{item.produto.unidade || "UN"}</p>
				<div className="w-[9%] px-1">
					<EditableNumberCell
						value={item.quantidade}
						ariaLabel="Editar quantidade"
						min={0.000001}
						gridRow={gridRow}
						gridCol={PURCHASE_ITEM_GRID_COL.QUANTITY}
						gridBounds={gridBounds}
						onCommit={(quantidade) => handleUpdate({ quantidade })}
					/>
				</div>
				<div className="w-[13%] px-1">
					<EditableNumberCell
						value={item.valorUnitarioBruto}
						ariaLabel="Editar valor unitário"
						min={0}
						gridRow={gridRow}
						gridCol={PURCHASE_ITEM_GRID_COL.UNIT_PRICE}
						gridBounds={gridBounds}
						format={(value) => (value > 0 ? formatToMoney(value) : "-")}
						onCommit={(valorUnitarioBruto) => handleUpdate({ valorUnitarioBruto })}
					/>
				</div>
				<div className="w-[11%] px-1">
					<EditableNumberCell
						value={item.descontosTotal ?? 0}
						ariaLabel="Editar descontos"
						min={0}
						gridRow={gridRow}
						gridCol={PURCHASE_ITEM_GRID_COL.DISCOUNT}
						gridBounds={gridBounds}
						format={(value) => (value > 0 ? formatToMoney(value) : "-")}
						onCommit={(descontosTotal) => handleUpdate({ descontosTotal })}
					/>
				</div>
				<div className="w-[11%] px-1">
					<EditableNumberCell
						value={item.acrescimosTotal ?? 0}
						ariaLabel="Editar acréscimos"
						min={0}
						gridRow={gridRow}
						gridCol={PURCHASE_ITEM_GRID_COL.SURCHARGE}
						gridBounds={gridBounds}
						format={(value) => (value > 0 ? formatToMoney(value) : "-")}
						onCommit={(acrescimosTotal) => handleUpdate({ acrescimosTotal })}
					/>
				</div>
				<p className="w-[12%] px-2 text-center font-mono text-xs tabular-nums text-foreground/80">{rowTotal > 0 ? formatToMoney(rowTotal) : "-"}</p>
				<div className="flex w-[5%] justify-center px-1">
					<DeleteRowButton onRemove={handleRemove} ariaLabel="Remover item da compra" />
				</div>
			</div>

			<div className="flex w-full flex-col gap-2 p-2 lg:hidden">
				<div className="flex w-full items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<ProductCell item={item} onChange={handleUpdate} />
					</div>
					<DeleteRowButton onRemove={handleRemove} ariaLabel="Remover item da compra" />
				</div>
				<div className="grid w-full grid-cols-2 gap-2">
					<MobileEditableField label="Qtde">
						<EditableNumberCell
							value={item.quantidade}
							ariaLabel="Editar quantidade"
							min={0.000001}
							onCommit={(quantidade) => handleUpdate({ quantidade })}
						/>
					</MobileEditableField>
					<MobileEditableField label="Valor unit.">
						<EditableNumberCell
							value={item.valorUnitarioBruto}
							ariaLabel="Editar valor unitário"
							min={0}
							format={(value) => (value > 0 ? formatToMoney(value) : "-")}
							onCommit={(valorUnitarioBruto) => handleUpdate({ valorUnitarioBruto })}
						/>
					</MobileEditableField>
					<MobileEditableField label="Desc.">
						<EditableNumberCell
							value={item.descontosTotal ?? 0}
							ariaLabel="Editar descontos"
							min={0}
							format={(value) => (value > 0 ? formatToMoney(value) : "-")}
							onCommit={(descontosTotal) => handleUpdate({ descontosTotal })}
						/>
					</MobileEditableField>
					<MobileEditableField label="Acrésc.">
						<EditableNumberCell
							value={item.acrescimosTotal ?? 0}
							ariaLabel="Editar acréscimos"
							min={0}
							format={(value) => (value > 0 ? formatToMoney(value) : "-")}
							onCommit={(acrescimosTotal) => handleUpdate({ acrescimosTotal })}
						/>
					</MobileEditableField>
				</div>
				<div className="flex w-full items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
					<span className="text-[0.65rem] font-medium uppercase text-muted-foreground">Total</span>
					<span className="font-mono text-xs font-medium tabular-nums">{rowTotal > 0 ? formatToMoney(rowTotal) : "-"}</span>
				</div>
			</div>
		</div>
	);
}

function DraftPurchaseCompositionItem({
	addPurchaseItem,
	gridRow,
	gridBounds,
}: {
	addPurchaseItem: (item: TPurchaseItemState) => void;
	gridRow: number;
	gridBounds: SpreadsheetGridBounds;
}) {
	const [draftItem, setDraftItem] = useState<TPurchaseItemState>(() => createEmptyPurchaseItem());

	function updateDraftItem(item: Partial<TPurchaseItemState>) {
		const nextDraftItem = normalizeItemValues({ ...draftItem, ...item });

		if (nextDraftItem.produtoId && nextDraftItem.quantidade > 0) {
			addPurchaseItem(nextDraftItem);
			setDraftItem(createEmptyPurchaseItem());
			return;
		}

		setDraftItem(nextDraftItem);
	}

	return (
		<div className="border-t border-dashed border-border bg-muted/20">
			<div className="hidden min-h-11 w-full items-center px-2 py-1 text-xs transition-colors hover:bg-muted/40 lg:flex">
				<div className="flex w-[30%] items-center gap-1 px-1">
					<Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<div className="min-w-0 flex-1">
						<ProductCell
							item={draftItem}
							gridRow={gridRow}
							gridCol={PURCHASE_ITEM_GRID_COL.PRODUCT}
							gridBounds={gridBounds}
							onChange={updateDraftItem}
							placeholder="NOVO PRODUTO"
						/>
					</div>
				</div>
				<p className="w-[9%] truncate px-2 text-center text-muted-foreground">{draftItem.produto.unidade || "UN"}</p>
				<div className="w-[9%] px-1">
					<EditableNumberCell
						value={draftItem.quantidade}
						ariaLabel="Editar quantidade do novo item"
						min={0.000001}
						gridRow={gridRow}
						gridCol={PURCHASE_ITEM_GRID_COL.QUANTITY}
						gridBounds={gridBounds}
						onCommit={(quantidade) => updateDraftItem({ quantidade })}
					/>
				</div>
				<div className="w-[13%] px-1">
					<EditableNumberCell
						value={draftItem.valorUnitarioBruto}
						ariaLabel="Editar valor unitário do novo item"
						min={0}
						gridRow={gridRow}
						gridCol={PURCHASE_ITEM_GRID_COL.UNIT_PRICE}
						gridBounds={gridBounds}
						format={(value) => (value > 0 ? formatToMoney(value) : "-")}
						onCommit={(valorUnitarioBruto) => updateDraftItem({ valorUnitarioBruto })}
					/>
				</div>
				<div className="w-[11%] px-1">
					<EditableNumberCell
						value={draftItem.descontosTotal ?? 0}
						ariaLabel="Editar descontos do novo item"
						min={0}
						gridRow={gridRow}
						gridCol={PURCHASE_ITEM_GRID_COL.DISCOUNT}
						gridBounds={gridBounds}
						format={(value) => (value > 0 ? formatToMoney(value) : "-")}
						onCommit={(descontosTotal) => updateDraftItem({ descontosTotal })}
					/>
				</div>
				<div className="w-[11%] px-1">
					<EditableNumberCell
						value={draftItem.acrescimosTotal ?? 0}
						ariaLabel="Editar acréscimos do novo item"
						min={0}
						gridRow={gridRow}
						gridCol={PURCHASE_ITEM_GRID_COL.SURCHARGE}
						gridBounds={gridBounds}
						format={(value) => (value > 0 ? formatToMoney(value) : "-")}
						onCommit={(acrescimosTotal) => updateDraftItem({ acrescimosTotal })}
					/>
				</div>
				<p className="w-[12%] px-2 text-center font-mono text-xs tabular-nums text-muted-foreground">-</p>
				<div className="w-[5%]" />
			</div>

			<div className="flex w-full flex-col gap-2 p-2 lg:hidden">
				<div className="flex w-full items-start gap-2">
					<Plus className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<div className="min-w-0 flex-1">
						<ProductCell item={draftItem} onChange={updateDraftItem} placeholder="Novo produto" />
					</div>
				</div>
				<div className="grid w-full grid-cols-2 gap-2">
					<MobileEditableField label="Qtde">
						<EditableNumberCell
							value={draftItem.quantidade}
							ariaLabel="Editar quantidade do novo item"
							min={0.000001}
							onCommit={(quantidade) => updateDraftItem({ quantidade })}
						/>
					</MobileEditableField>
					<MobileEditableField label="Valor unit.">
						<EditableNumberCell
							value={draftItem.valorUnitarioBruto}
							ariaLabel="Editar valor unitário do novo item"
							min={0}
							format={(value) => (value > 0 ? formatToMoney(value) : "-")}
							onCommit={(valorUnitarioBruto) => updateDraftItem({ valorUnitarioBruto })}
						/>
					</MobileEditableField>
				</div>
			</div>
		</div>
	);
}

function ProductCell({
	item,
	onChange,
	gridRow,
	gridCol,
	gridBounds,
	placeholder = "Selecionar produto",
}: {
	item: TPurchaseItemState;
	onChange: (item: Partial<TPurchaseItemState>) => void;
	gridRow?: number;
	gridCol?: number;
	gridBounds?: SpreadsheetGridBounds;
	placeholder?: string;
}) {
	const hasGridNavigation = gridRow !== undefined && gridCol !== undefined && gridBounds !== undefined;
	const selectedName = getItemDisplayName(item);
	const selectedCode = item.snapshotProdutoCodigo || item.produto.codigo;
	const imageUrl = item.produtoVariante?.imagemCapaUrl || item.produto.imagemCapaUrl;

	function handleChange(value: TSelectProductWithVariantsValue) {
		if (!value?.product) {
			onChange(createEmptyPurchaseItem());
			return;
		}

		const unitCost = value.productVariant?.precoCusto ?? value.product.precoCusto ?? 0;
		onChange({
			produtoId: value.product.id,
			produtoVarianteId: value.productVariant?.id ?? null,
			snapshotProdutoDescricao: value.productVariant?.nome ?? value.product.nome,
			snapshotProdutoCodigo: value.productVariant?.codigo ?? value.product.codigo,
			produto: {
				nome: value.product.nome,
				codigo: value.product.codigo,
				unidade: value.product.unidade,
				imagemCapaUrl: value.product.imagemCapaUrl ?? null,
			},
			produtoVariante: value.productVariant
				? {
						nome: value.productVariant.nome,
						codigo: value.productVariant.codigo ?? "",
						imagemCapaUrl: value.productVariant.imagemCapaUrl ?? null,
					}
				: undefined,
			valorUnitarioBruto: unitCost,
		});
	}

	const productSelect = (
		<SelectProductWithVariants
			label="PRODUTO"
			showLabel={false}
			value={item.produtoId ? { productId: item.produtoId, productVariantId: item.produtoVarianteId } : null}
			selectedLabel={item.produtoId ? selectedName : placeholder}
			resetOptionLabel="SELECIONE UM PRODUTO"
			holderClassName="h-auto min-h-8 rounded-md border-transparent bg-transparent px-2 py-1 text-left shadow-none hover:border-border hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40"
			popoverContentClassName="w-[var(--radix-popover-trigger-width)] min-w-[410px] max-w-[520px]"
			commandListClassName="max-h-[360px]"
			handleChange={handleChange}
			onReset={() => onChange(createEmptyPurchaseItem())}
			renderTriggerContent={() => (
				<span className="flex min-w-0 flex-1 items-center gap-2">
					<ProductThumb imageUrl={imageUrl} label={selectedName} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className={cn("truncate text-xs font-medium", !item.produtoId && "text-muted-foreground")}>
							{item.produtoId ? selectedName : placeholder}
						</span>
						{selectedCode ? <span className="truncate text-[0.65rem] text-muted-foreground">{selectedCode}</span> : null}
					</span>
				</span>
			)}
			triggerProps={
				hasGridNavigation
					? {
							onFocus: () => {
								consumeProgrammaticSpreadsheetFocus();
							},
							onKeyDown: (event) => {
								if (event.key === "Enter") return;
								handleSpreadsheetNavigationKeyDown(event, {
									coords: { row: gridRow, col: gridCol },
									bounds: gridBounds,
								});
							},
						}
					: undefined
			}
		/>
	);

	if (!hasGridNavigation) return productSelect;

	return (
		<SpreadsheetCellWrapper gridRow={gridRow} gridCol={gridCol}>
			{productSelect}
		</SpreadsheetCellWrapper>
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
			<BoxIcon className="h-3.5 w-3.5" />
		</span>
	);
}

function roundTo2(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeItemValues(item: TPurchaseItemState): TPurchaseItemState {
	const quantidade = Number(item.quantidade) || 0;
	const valorUnitarioBruto = Number(item.valorUnitarioBruto) || 0;
	const descontosTotal = Number(item.descontosTotal) || 0;
	const acrescimosTotal = Number(item.acrescimosTotal) || 0;
	const valorTotalBruto = roundTo2(quantidade * valorUnitarioBruto);
	const valorTotalLiquido = roundTo2(valorTotalBruto - descontosTotal + acrescimosTotal);
	const valorUnitarioLiquido = quantidade > 0 ? roundTo2(valorTotalLiquido / quantidade) : 0;

	return {
		...item,
		quantidade,
		valorUnitarioBruto,
		descontosTotal,
		acrescimosTotal,
		valorTotalBruto,
		valorTotalLiquido,
		valorUnitarioLiquido,
	};
}

function getItemTotal(item: TPurchaseItemState) {
	const valorTotalBruto = Number(item.valorTotalBruto) || (Number(item.quantidade) || 0) * (Number(item.valorUnitarioBruto) || 0);
	return Number(item.valorTotalLiquido) || valorTotalBruto - (Number(item.descontosTotal) || 0) + (Number(item.acrescimosTotal) || 0);
}

function getItemDisplayName(item: TPurchaseItemState) {
	if (item.produtoVariante?.nome) return `${item.produto.nome} - ${item.produtoVariante.nome}`;
	return item.produto.nome || item.snapshotProdutoDescricao;
}

function createEmptyPurchaseItem(): TPurchaseItemState {
	return {
		produtoId: "",
		produtoVarianteId: null,
		snapshotProdutoDescricao: "",
		snapshotProdutoCodigo: "",
		produto: {
			nome: "",
			codigo: "",
			unidade: "UN",
			imagemCapaUrl: null,
		},
		produtoVariante: undefined,
		quantidade: 1,
		valorUnitarioBruto: 0,
		valorTotalBruto: 0,
		valorUnitarioLiquido: 0,
		valorTotalLiquido: 0,
		descontosTotal: 0,
		acrescimosTotal: 0,
	};
}
