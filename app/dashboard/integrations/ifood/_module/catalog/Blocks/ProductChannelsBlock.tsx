"use client";

import EditableNumberCell from "@/components/Spreadsheet/EditableNumberCell";
import EditableTextCell from "@/components/Spreadsheet/EditableTextCell";
import MobileEditableField from "@/components/Spreadsheet/MobileEditableField";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { formatToMoney } from "@/lib/formatting";
import { SPREADSHEET_TABLE_ATTR, type SpreadsheetGridBounds } from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import { IFOOD_CATALOG_CONTEXT_LABELS, type TIfoodCatalogContextEnum, type TIfoodCatalogStatusEnum } from "@/schemas/enums";
import type { TIfoodChannelState } from "@/state-hooks/use-internal-ifood-product-state";
import { Store } from "lucide-react";

const CHANNEL_GRID_COL = { PRICE: 0, EXTERNAL_CODE: 1 } as const;
const CHANNEL_GRID_COL_COUNT = 2;

const CHANNEL_TABLE_GRID = "grid-cols-[minmax(0,26fr)_minmax(0,20fr)_minmax(0,24fr)_minmax(0,22fr)]";
const CHANNEL_DESKTOP_ROW = cn("hidden w-full lg:grid", CHANNEL_TABLE_GRID, "items-center gap-x-1 px-2");

/** Ciclo do seletor de status por canal: herdar → disponível → indisponível → herdar. */
function nextChannelStatus(status: TIfoodCatalogStatusEnum | null): TIfoodCatalogStatusEnum | null {
	if (status === null) return "AVAILABLE";
	if (status === "AVAILABLE") return "UNAVAILABLE";
	return null;
}

function StatusPill({ status, editable, onCycle }: { status: TIfoodCatalogStatusEnum | null; editable: boolean; onCycle: () => void }) {
	const config =
		status === null
			? { label: "HERDA", className: "bg-muted text-muted-foreground" }
			: status === "AVAILABLE"
				? { label: "DISPONÍVEL", className: "bg-success/15 text-success" }
				: { label: "INDISPONÍVEL", className: "bg-destructive/15 text-destructive" };

	const className = cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", config.className);
	if (!editable) return <span className={className}>{config.label}</span>;

	return (
		<button
			type="button"
			onClick={onCycle}
			className={cn(className, "transition-opacity hover:opacity-70")}
			title="Alternar entre herdar, disponível e indisponível"
		>
			{config.label}
		</button>
	);
}

type ProductChannelsBlockProps = {
	canais: TIfoodChannelState[];
	precoPadrao: number | null;
	editable?: boolean;
	embedded?: boolean;
	/**
	 * Contextos que a loja realmente tem (vindos de `GET /catalogs`). Quando informado, só esses
	 * aparecem — o iFood ACEITA e descarta em silêncio um modifier de canal que a loja não possui,
	 * então oferecer os três a uma loja só-delivery prometeria algo que nunca acontece.
	 */
	contextosDisponiveis?: TIfoodCatalogContextEnum[] | null;
	onUpdateCanal: (contexto: TIfoodChannelState["contexto"], canal: Partial<TIfoodChannelState>) => void;
};

/**
 * Preço, disponibilidade e código de PDV por canal de venda (`contextModifiers`).
 *
 * Campo vazio HERDA o valor do item — é o que evita duplicar o produto só porque o preço no salão é
 * diferente do preço na entrega. A UI mostra o valor herdado como placeholder para que o lojista
 * veja o que vai valer sem precisar preencher.
 */
export function ProductChannelsBlock({
	canais,
	precoPadrao,
	editable = true,
	embedded = false,
	contextosDisponiveis,
	onUpdateCanal,
}: ProductChannelsBlockProps) {
	const canaisVisiveis = contextosDisponiveis?.length ? canais.filter((canal) => contextosDisponiveis.includes(canal.contexto)) : canais;
	const gridBounds: SpreadsheetGridBounds = { rowCount: canaisVisiveis.length, colCount: CHANNEL_GRID_COL_COUNT };

	const content = (
		<div className="flex w-full flex-col gap-2">
			<p className="text-xs text-muted-foreground">
				{canaisVisiveis.length === 1
					? "Esta loja vende por um canal só. Preço e disponibilidade aqui valem para ele."
					: "O mesmo item pode ter preço e disponibilidade diferentes em cada canal. Deixe em branco para herdar o valor do item."}
			</p>

			<div {...{ [SPREADSHEET_TABLE_ATTR]: "true" }} className="flex w-full flex-col">
				<div
					className={cn(
						CHANNEL_DESKTOP_ROW,
						"min-h-8 border-b border-border bg-background py-1.5 text-[0.68rem] font-medium uppercase text-muted-foreground",
					)}
				>
					<p className="min-w-0 px-1 text-start">Canal</p>
					<p className="min-w-0 px-1 text-center">Preço</p>
					<p className="min-w-0 px-1 text-center">Código (PDV)</p>
					<p className="min-w-0 px-1 text-center">Disponibilidade</p>
				</div>

				<div className="flex w-full flex-col bg-background">
					{canaisVisiveis.map((canal, indice) => (
						<div key={canal.contexto} className={cn("border-t border-border", indice % 2 === 1 && "bg-muted/10")}>
							<div className={cn(CHANNEL_DESKTOP_ROW, "min-h-11 py-1 text-xs")}>
								<p className="min-w-0 truncate px-1 font-medium text-foreground">{IFOOD_CATALOG_CONTEXT_LABELS[canal.contexto]}</p>
								<div className="min-w-0 px-1">
									<EditableNumberCell
										value={canal.preco}
										ariaLabel={`Editar preço em ${IFOOD_CATALOG_CONTEXT_LABELS[canal.contexto]}`}
										min={0}
										format={formatToMoney}
										emptyDisplay={precoPadrao != null ? `${formatToMoney(precoPadrao)} (herda)` : "herda"}
										gridRow={indice}
										gridCol={CHANNEL_GRID_COL.PRICE}
										gridBounds={gridBounds}
										onCommit={(preco) => onUpdateCanal(canal.contexto, { preco })}
									/>
								</div>
								<div className="min-w-0 px-1">
									<EditableTextCell
										value={canal.codigoExterno ?? ""}
										ariaLabel={`Editar código externo em ${IFOOD_CATALOG_CONTEXT_LABELS[canal.contexto]}`}
										align="center"
										emptyDisplay="herda"
										gridRow={indice}
										gridCol={CHANNEL_GRID_COL.EXTERNAL_CODE}
										gridBounds={gridBounds}
										onCommit={(codigoExterno) => onUpdateCanal(canal.contexto, { codigoExterno: codigoExterno || null })}
									/>
								</div>
								<div className="flex min-w-0 items-center justify-center px-1">
									<StatusPill
										status={canal.status}
										editable={editable}
										onCycle={() => onUpdateCanal(canal.contexto, { status: nextChannelStatus(canal.status) })}
									/>
								</div>
							</div>

							<div className="flex w-full flex-col gap-2 px-2 py-2.5 lg:hidden">
								<div className="flex items-center justify-between gap-2">
									<span className="text-sm font-medium">{IFOOD_CATALOG_CONTEXT_LABELS[canal.contexto]}</span>
									<StatusPill
										status={canal.status}
										editable={editable}
										onCycle={() => onUpdateCanal(canal.contexto, { status: nextChannelStatus(canal.status) })}
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<MobileEditableField label="Preço">
										<EditableNumberCell
											value={canal.preco}
											ariaLabel={`Editar preço em ${IFOOD_CATALOG_CONTEXT_LABELS[canal.contexto]}`}
											min={0}
											format={formatToMoney}
											emptyDisplay={precoPadrao != null ? `${formatToMoney(precoPadrao)} (herda)` : "herda"}
											align="left"
											onCommit={(preco) => onUpdateCanal(canal.contexto, { preco })}
										/>
									</MobileEditableField>
									<MobileEditableField label="Código (PDV)">
										<EditableTextCell
											value={canal.codigoExterno ?? ""}
											ariaLabel={`Editar código externo em ${IFOOD_CATALOG_CONTEXT_LABELS[canal.contexto]}`}
											align="left"
											emptyDisplay="herda"
											onCommit={(codigoExterno) => onUpdateCanal(canal.contexto, { codigoExterno: codigoExterno || null })}
										/>
									</MobileEditableField>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);

	if (embedded) return content;

	return (
		<SectionWrapper icon={<Store className="h-4 w-4 min-h-4 min-w-4" />} title="CANAIS DE VENDA">
			{content}
		</SectionWrapper>
	);
}
