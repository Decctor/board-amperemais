"use client";

import RenameProductGroup from "@/components/Modals/Products/RenameProductGroup";
import { Button } from "@/components/ui/button";
import type { TShowcaseGroup } from "@/state-hooks/use-sales-channel-showcase-state";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useState } from "react";
import ShowcaseProductTable from "./ShowcaseProductTable";

type ShowcaseGroupPanelProps = {
	group: TShowcaseGroup;
	position: number;
	canMoveUp: boolean;
	canMoveDown: boolean;
	/** Demais grupos da vitrine, para avisar quando o novo nome funde dois cadastros. */
	otherGroups: string[];
	moveGroup: (grupo: string, direction: "up" | "down") => void;
	renameGroup: (grupoAtual: string, grupoNovo: string) => void;
	updateProductPrice: (produtoId: string, precoVenda: number | null) => void;
	removeProduct: (produtoId: string) => void;
};

export default function ShowcaseGroupPanel({
	group,
	position,
	canMoveUp,
	canMoveDown,
	otherGroups,
	moveGroup,
	renameGroup,
	updateProductPrice,
	removeProduct,
}: ShowcaseGroupPanelProps) {
	const [isRenaming, setIsRenaming] = useState(false);

	return (
		<div className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xs">
			<div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-3 py-2.5">
				<div className="flex min-w-0 flex-1 items-center gap-2.5">
					<span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background px-1.5 text-[0.65rem] font-semibold tabular-nums tracking-tight text-muted-foreground">
						{group.ungrouped ? "—" : String(position).padStart(2, "0")}
					</span>
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-sm font-semibold">{group.label}</span>
						<span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">
							{group.produtos.length === 1 ? "1 produto" : `${group.produtos.length} produtos`}
							{group.ungrouped ? " · sem grupo, exibidos no fim da loja" : null}
						</span>
					</div>
				</div>

				{/* O balde dos sem grupo não se move nem se renomeia: ele não é um grupo do cadastro,
				    é a ausência de um. Dar nome a ele seria editar produto por produto. */}
				{group.ungrouped ? null : (
					<div className="flex shrink-0 items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							aria-label={`Renomear o grupo ${group.label}`}
							onClick={() => setIsRenaming(true)}
						>
							<Pencil className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							disabled={!canMoveUp}
							aria-label={`Mover o grupo ${group.label} para cima`}
							onClick={() => moveGroup(group.key, "up")}
						>
							<ChevronUp className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							disabled={!canMoveDown}
							aria-label={`Mover o grupo ${group.label} para baixo`}
							onClick={() => moveGroup(group.key, "down")}
						>
							<ChevronDown className="h-4 w-4" />
						</Button>
					</div>
				)}
			</div>

			<ShowcaseProductTable produtos={group.produtos} updateProductPrice={updateProductPrice} removeProduct={removeProduct} />

			{isRenaming ? (
				<RenameProductGroup
					grupo={group.key}
					existingGroups={otherGroups}
					closeModal={() => setIsRenaming(false)}
					callbacks={{ onSuccess: (grupoNovo) => renameGroup(group.key, grupoNovo) }}
				/>
			) : null}
		</div>
	);
}
