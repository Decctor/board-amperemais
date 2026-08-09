"use client";

import type { TGetStockRecountOutputRow } from "@/app/api/products/stock-recount/route";
import EditableNumberCell from "@/components/Spreadsheet/EditableNumberCell";
import MobileEditableField from "@/components/Spreadsheet/MobileEditableField";
import { Button } from "@/components/ui/button";
import { formatDecimalPlaces } from "@/lib/formatting";
import { SPREADSHEET_TABLE_ATTR, type SpreadsheetGridBounds } from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import { stockRecountEntryKey, type TUseStockRecountDraft } from "@/state-hooks/use-stock-recount-draft";
import { CornerDownRight, ShoppingCart, X } from "lucide-react";
import Image from "next/image";

const COUNT_GRID_COL = { COUNT: 0 } as const;
const RECOUNT_TABLE_GRID = "grid-cols-[minmax(0,32fr)_minmax(0,12fr)_minmax(0,8fr)_minmax(0,14fr)_minmax(0,18fr)_minmax(0,16fr)]";
const RECOUNT_DESKTOP_ROW = cn("hidden w-full lg:grid", RECOUNT_TABLE_GRID, "items-center gap-x-1 px-2");

function DeltaChip({ delta }: { delta: number }) {
	const className = cn(
		"inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-bold tabular-nums",
		delta > 0 && "bg-success/15 text-success",
		delta < 0 && "bg-destructive/15 text-destructive",
		delta === 0 && "bg-muted text-muted-foreground",
	);
	const label = delta > 0 ? `+${formatDecimalPlaces(delta)}` : delta < 0 ? `-${formatDecimalPlaces(Math.abs(delta))}` : "0";
	return <span className={className}>{label}</span>;
}

function RowImage({ row, size = "h-8 w-8" }: { row: TGetStockRecountOutputRow; size?: string }) {
	return (
		<div className={cn("relative shrink-0 overflow-hidden rounded-md ring-1 ring-border", size)}>
			{row.imagemCapaUrl ? (
				<Image src={row.imagemCapaUrl} alt={row.nome} fill className="object-cover" />
			) : (
				<div className="bg-primary/10 text-primary flex h-full w-full items-center justify-center">
					<ShoppingCart className="h-3.5 w-3.5" />
				</div>
			)}
		</div>
	);
}

type RecountCountCellProps = {
	row: TGetStockRecountOutputRow;
	draft: TUseStockRecountDraft;
	gridRow?: number;
	gridBounds?: SpreadsheetGridBounds;
	align?: "left" | "center";
};

/**
 * Célula da quantidade contada. "Ainda não contado" e "contado como zero" são distinguidos pelo
 * rascunho, não pelo valor numérico: sem entrada no rascunho a célula mostra "—"; com entrada,
 * mostra o número contado (inclusive 0).
 */
function RecountCountCell({ row, draft, gridRow, gridBounds, align = "center" }: RecountCountCellProps) {
	const entry = draft.getEntry(stockRecountEntryKey(row.produtoId, row.produtoVarianteId));

	return (
		<EditableNumberCell
			value={entry?.quantidadeContada ?? null}
			ariaLabel={`Informar quantidade contada de ${row.varianteNome ? `${row.nome} — ${row.varianteNome}` : row.nome}`}
			min={0}
			format={entry ? (value) => formatDecimalPlaces(value) : undefined}
			emptyDisplay={entry ? undefined : "—"}
			align={align}
			gridRow={gridRow}
			gridCol={gridRow !== undefined ? COUNT_GRID_COL.COUNT : undefined}
			gridBounds={gridBounds}
			onCommit={(value) => draft.setCount(row, value)}
		/>
	);
}

type RecountTableProps = {
	rows: TGetStockRecountOutputRow[];
	draft: TUseStockRecountDraft;
};

/** Planilha de recontagem: uma linha por entidade rastreada (produto e/ou variante). */
export default function RecountTable({ rows, draft }: RecountTableProps) {
	const gridBounds: SpreadsheetGridBounds = { rowCount: rows.length, colCount: 1 };

	return (
		<div {...{ [SPREADSHEET_TABLE_ATTR]: "true" }} className="border-border flex w-full flex-col overflow-hidden rounded-xl border">
			<div
				className={cn(
					RECOUNT_DESKTOP_ROW,
					"border-border bg-background min-h-8 border-b py-1.5 text-[0.68rem] font-medium uppercase text-muted-foreground",
				)}
			>
				<p className="min-w-0 px-1 text-start">Produto</p>
				<p className="min-w-0 px-1 text-center">Código</p>
				<p className="min-w-0 px-1 text-center">Un.</p>
				<p className="min-w-0 px-1 text-center">Saldo atual</p>
				<p className="min-w-0 px-1 text-center">Qtde. contada</p>
				<p className="min-w-0 px-1 text-center">Diferença</p>
			</div>

			<div className="bg-background flex w-full flex-col">
				{rows.map((row, index) => {
					const key = stockRecountEntryKey(row.produtoId, row.produtoVarianteId);
					const entry = draft.getEntry(key);
					const delta = entry ? entry.quantidadeContada - row.quantidade : null;

					return (
						<div key={key} className={cn("border-border border-t", entry ? "bg-primary/5" : index % 2 === 1 && "bg-muted/10")}>
							{/* Linha desktop */}
							<div className={cn(RECOUNT_DESKTOP_ROW, "hover:bg-muted/40 min-h-12 py-1 text-xs transition-colors")}>
								<div className={cn("flex min-w-0 items-center gap-2 px-1", row.produtoVarianteId && "pl-5")}>
									{row.produtoVarianteId ? <CornerDownRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" /> : null}
									<RowImage row={row} />
									<div className="flex min-w-0 flex-col">
										<span className="text-foreground truncate font-medium">{row.nome}</span>
										{row.varianteNome ? <span className="text-muted-foreground truncate text-[0.7rem]">{row.varianteNome}</span> : null}
									</div>
								</div>
								<p className="text-muted-foreground min-w-0 truncate px-1 text-center">{row.codigo ?? "—"}</p>
								<p className="text-muted-foreground min-w-0 truncate px-1 text-center">{row.unidade}</p>
								<p className="min-w-0 px-1 text-center tabular-nums">{formatDecimalPlaces(row.quantidade)}</p>
								<div className="min-w-0 px-1">
									<RecountCountCell row={row} draft={draft} gridRow={index} gridBounds={gridBounds} />
								</div>
								<div className="flex min-w-0 items-center justify-center gap-1 px-1">
									{delta !== null ? (
										<>
											<DeltaChip delta={delta} />
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label={`Limpar contagem de ${row.varianteNome ? `${row.nome} — ${row.varianteNome}` : row.nome}`}
												onClick={() => draft.clearEntry(key)}
											>
												<X className="h-3.5 w-3.5" />
											</Button>
										</>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</div>
							</div>

							{/* Cartão mobile */}
							<div className="flex w-full flex-col gap-2 px-2 py-2.5 lg:hidden">
								<div className="flex items-start justify-between gap-2">
									<div className="flex min-w-0 items-center gap-2">
										<RowImage row={row} size="h-9 w-9" />
										<div className="flex min-w-0 flex-col">
											<span className="truncate text-sm font-medium">{row.nome}</span>
											{row.varianteNome ? <span className="text-muted-foreground truncate text-xs">{row.varianteNome}</span> : null}
										</div>
									</div>
									{delta !== null ? (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-label={`Limpar contagem de ${row.varianteNome ? `${row.nome} — ${row.varianteNome}` : row.nome}`}
											onClick={() => draft.clearEntry(key)}
										>
											<X className="h-3.5 w-3.5" />
										</Button>
									) : null}
								</div>
								<div className="grid grid-cols-3 items-end gap-2">
									<MobileEditableField label="Saldo atual">
										<span className="text-sm tabular-nums">
											{formatDecimalPlaces(row.quantidade)} {row.unidade}
										</span>
									</MobileEditableField>
									<MobileEditableField label="Qtde. contada">
										<RecountCountCell row={row} draft={draft} align="left" />
									</MobileEditableField>
									<MobileEditableField label="Diferença">
										{delta !== null ? <DeltaChip delta={delta} /> : <span className="text-muted-foreground text-sm">—</span>}
									</MobileEditableField>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
