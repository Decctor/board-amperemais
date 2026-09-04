"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { cn } from "@/lib/utils";
import type { TGetClientDuplicatesOutput } from "@/app/api/clients/duplicates/route";
import { useState } from "react";

import { ClientReconciliation, useClientReconciliation, useReconciliationMenuActionProps } from "./ClientReconciliation";

type TPairSummary = NonNullable<TGetClientDuplicatesOutput["data"]["byEntity"]>["items"][number];

type ClientReconciliationDialogProps = {
	pairs: TPairSummary[];
	/** Cliente da página atual — vira o keeper padrão. */
	perspectiveClienteId: string;
	canReconcile: boolean;
	onClose: () => void;
	onResolved: () => void;
	/** Chamado após um merge bem sucedido (para redirecionar quando a página era do cliente removido). */
	onMerged?: (result: { keeperId: string; sourceId: string }) => void;
};

const MENU_TITLE = "RECONCILIAÇÃO DE CLIENTES";
const MENU_DESCRIPTION = "Compare os cadastros, escolha qual será mantido e mescle o histórico, ou descarte o par se não forem a mesma pessoa.";

function PairSwitcher({ pairs, selectedPairId, onSelect }: { pairs: TPairSummary[]; selectedPairId: string; onSelect: (pairId: string) => void }) {
	return (
		<div className="flex w-full flex-col gap-1.5">
			<p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Par em análise</p>
			<div className="flex flex-wrap gap-1.5">
				{pairs.map((pair) => {
					const isSelected = pair.id === selectedPairId;
					return (
						<button
							key={pair.id}
							type="button"
							aria-pressed={isSelected}
							onClick={() => onSelect(pair.id)}
							className={cn(
								"max-w-full truncate rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
								"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
								isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
							)}
						>
							{pair.clienteA?.nome ?? "Cliente"} × {pair.clienteB?.nome ?? "Cliente"}
						</button>
					);
				})}
			</div>
		</div>
	);
}

/** Casca do ResponsiveMenu; precisa viver dentro do provider para ler estado e montar o rodapé. */
function ReconciliationDialogMenu({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
	const { state, meta } = useClientReconciliation();
	const actionProps = useReconciliationMenuActionProps();

	const menuBaseProps = {
		menuTitle: MENU_TITLE,
		menuDescription: MENU_DESCRIPTION,
		stateIsLoading: state.isLoading,
		stateError: !meta.pairId ? "Nenhum par de duplicidade para comparar." : state.error,
		closeMenu: onClose,
		dialogVariant: "md",
		drawerVariant: "lg",
		lockClose: state.isPending,
	} as const;

	if (!meta.canReconcile) {
		return (
			<ResponsiveMenu {...menuBaseProps} mode="read-only" menuCancelButtonText="FECHAR">
				{children}
				<ClientReconciliation.Body />
			</ResponsiveMenu>
		);
	}

	return (
		<ResponsiveMenu {...menuBaseProps} {...actionProps}>
			{children}
			<ClientReconciliation.Body />
		</ResponsiveMenu>
	);
}

export function ClientReconciliationDialog({
	pairs,
	perspectiveClienteId,
	canReconcile,
	onClose,
	onResolved,
	onMerged,
}: ClientReconciliationDialogProps) {
	const [selectedPairId, setSelectedPairId] = useState(pairs[0]?.id ?? "");

	return (
		<ClientReconciliation.Provider
			pairId={selectedPairId}
			perspectiveClienteId={perspectiveClienteId}
			canReconcile={canReconcile}
			onResolved={() => {
				onResolved();
				onClose();
			}}
			onMerged={onMerged}
		>
			<ReconciliationDialogMenu onClose={onClose}>
				{pairs.length > 1 ? <PairSwitcher pairs={pairs} selectedPairId={selectedPairId} onSelect={setSelectedPairId} /> : null}
			</ReconciliationDialogMenu>
		</ClientReconciliation.Provider>
	);
}
