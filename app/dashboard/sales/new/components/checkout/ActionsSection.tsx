import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";

type ActionsSectionProps = {
	saleState: TUseSaleState;
	onCreateDraft: () => void;
	onFinalizeSale: () => void;
	isCreatingDraft?: boolean;
	isFinalizingSale?: boolean;
	// Modo edição: um único CTA de salvar (não existe "orçamento" para uma venda confirmada).
	editMode?: boolean;
	// Bloqueio externo ao estado do carrinho (caixa fechado, preços defasados). O texto aparece sob o
	// CTA: um botão desabilitado sem motivo faz o operador procurar o problema no lugar errado.
	finalizeBlockedReason?: string | null;
	// CTA único, sem "criar como orçamento": o checkout converte um rascunho que já existe.
	hideDraftAction?: boolean;
};

export default function ActionsSection({
	saleState,
	onCreateDraft,
	onFinalizeSale,
	isCreatingDraft,
	isFinalizingSale,
	editMode,
	finalizeBlockedReason,
	hideDraftAction,
}: ActionsSectionProps) {
	const finalizeDisabled = !saleState.isReadyForFinalize || isFinalizingSale || !!finalizeBlockedReason;

	const blockedNote = finalizeBlockedReason ? <p className="text-center text-[11px] text-muted-foreground">{finalizeBlockedReason}</p> : null;

	if (editMode) {
		return (
			<div className="grid grid-cols-1 gap-2">
				<Button className={cn("w-full", finalizeDisabled && "opacity-50")} onClick={onFinalizeSale} disabled={finalizeDisabled}>
					{isFinalizingSale ? "SALVANDO ALTERAÇÕES..." : "SALVAR ALTERAÇÕES"}
				</Button>
				{blockedNote}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-2">
			{hideDraftAction ? null : (
				<Button
					variant="ghost"
					className={cn("w-full", !saleState.isReadyForDraft && "opacity-50")}
					onClick={onCreateDraft}
					disabled={!saleState.isReadyForDraft || isCreatingDraft || isFinalizingSale}
				>
					{isCreatingDraft ? "CRIANDO ORÇAMENTO..." : "CRIAR COMO ORÇAMENTO"}
				</Button>
			)}
			<Button
				className={cn("w-full", (finalizeDisabled || isCreatingDraft) && "opacity-50")}
				onClick={onFinalizeSale}
				disabled={finalizeDisabled || isCreatingDraft}
			>
				{isFinalizingSale ? (hideDraftAction ? "CONFIRMANDO VENDA..." : "FINALIZANDO VENDA...") : hideDraftAction ? "CONFIRMAR VENDA" : "FINALIZAR VENDA"}
			</Button>
			{blockedNote}
		</div>
	);
}
