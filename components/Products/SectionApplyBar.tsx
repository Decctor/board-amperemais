"use client";

import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";

type SectionApplyBarProps = {
	isDirty: boolean;
	isPending: boolean;
	onApply: () => void;
	onDiscard: () => void;
};

export default function SectionApplyBar({ isDirty, isPending, onApply, onDiscard }: SectionApplyBarProps) {
	if (!isDirty) return null;

	return (
		<div className="sticky bottom-0 -mx-3 mt-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-3 py-3 backdrop-blur-sm">
			<p className="text-xs text-muted-foreground">Alterações não salvas nesta seção</p>
			<div className="flex shrink-0 items-center gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={isPending}>
					DESCARTAR
				</Button>
				<LoadingButton type="button" size="sm" loading={isPending} onClick={onApply}>
					APLICAR ALTERAÇÕES
				</LoadingButton>
			</div>
		</div>
	);
}
