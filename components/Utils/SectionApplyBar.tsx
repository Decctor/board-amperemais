"use client";

import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";

type SectionApplyBarProps = {
	isDirty: boolean;
	isPending: boolean;
	disabled?: boolean;
	/** Motivo do bloqueio, mostrado no lugar do aviso padrão quando `disabled`. */
	disabledReason?: string | null;
	onApply: () => void;
	onDiscard: () => void;
};

/** Barra de alterações não salvas de uma seção editável. Some quando não há o que aplicar. */
export default function SectionApplyBar({ isDirty, isPending, disabled = false, disabledReason, onApply, onDiscard }: SectionApplyBarProps) {
	if (!isDirty) return null;

	return (
		<div className="sticky bottom-0 -mx-3 mt-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-3 py-3 backdrop-blur-sm">
			<p className={disabled && disabledReason ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
				{disabled && disabledReason ? disabledReason : "Alterações não salvas nesta seção"}
			</p>
			<div className="flex shrink-0 items-center gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={isPending}>
					DESCARTAR
				</Button>
				<LoadingButton type="button" size="sm" loading={isPending} disabled={disabled} onClick={onApply}>
					APLICAR ALTERAÇÕES
				</LoadingButton>
			</div>
		</div>
	);
}
