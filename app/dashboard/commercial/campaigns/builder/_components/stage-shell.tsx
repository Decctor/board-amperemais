"use client";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/loading-button";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

/**
 * Compound layout for a builder stage. Children read state from BuilderUiContext
 * — we don't pass booleans like isLastStage everywhere.
 *
 * Usage:
 *   <StageShell>
 *     <StageShell.Title icon={Icon} label="..." description="..." />
 *     <StageShell.Body>...</StageShell.Body>
 *     <StageShell.Footer ... />
 *   </StageShell>
 */
function StageShellRoot({ children, className }: { children: ReactNode; className?: string }) {
	return <section className={cn("flex w-full flex-col gap-5", className)}>{children}</section>;
}

function StageShellTitle({
	icon: Icon,
	label,
	description,
	rightSlot,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	description?: string;
	rightSlot?: ReactNode;
}) {
	return (
		<header className="flex w-full items-start justify-between gap-3 border-b border-primary/10 pb-3">
			<div className="flex items-start gap-3">
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
					<Icon className="h-4 w-4" />
				</div>
				<div className="flex flex-col">
					<h2 className="text-sm font-semibold tracking-tight">{label}</h2>
					{description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
				</div>
			</div>
			{rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
		</header>
	);
}

function StageShellBody({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("flex w-full flex-col gap-4", className)}>{children}</div>;
}

type StageShellFooterProps = {
	canGoBack?: boolean;
	canGoNext?: boolean;
	nextDisabled?: boolean;
	nextDisabledReason?: string;
	onBack?: () => void;
	onNext?: () => void;
	nextLabel?: string;
	backLabel?: string;
	isFinalStage?: boolean;
	finalLabel?: string;
	finalLoading?: boolean;
	onFinal?: () => void;
};
function StageShellFooter({
	canGoBack = true,
	canGoNext = true,
	nextDisabled,
	nextDisabledReason,
	onBack,
	onNext,
	nextLabel = "PRÓXIMO",
	backLabel = "VOLTAR",
	isFinalStage,
	finalLabel = "SALVAR",
	finalLoading,
	onFinal,
}: StageShellFooterProps) {
	return (
		<footer className="mt-2 flex w-full flex-col gap-2 border-t border-primary/10 pt-3">
			{nextDisabled && nextDisabledReason ? <p className="text-xs text-amber-600 dark:text-amber-400 text-end">{nextDisabledReason}</p> : null}
			<div className="flex w-full items-center justify-between gap-2">
				<div>
					{canGoBack && onBack ? (
						<Button type="button" variant="ghost" onClick={onBack} className="flex items-center gap-1.5">
							<ArrowLeft className="h-3.5 w-3.5" />
							{backLabel}
						</Button>
					) : (
						<span />
					)}
				</div>
				<div className="flex items-center gap-2">
					{isFinalStage && onFinal ? (
						<Button type="button" variant="brand" onClick={onFinal} disabled={nextDisabled} className="flex items-center gap-1.5">
							<CheckCircle2 className="h-3.5 w-3.5" />
							{finalLabel}
						</Button>
					) : canGoNext && onNext ? (
						<Button type="button" onClick={onNext} disabled={nextDisabled} className="flex items-center gap-1.5">
							{nextLabel}
							<ArrowRight className="h-3.5 w-3.5" />
						</Button>
					) : null}
				</div>
			</div>
		</footer>
	);
}

export const StageShell = Object.assign(StageShellRoot, {
	Title: StageShellTitle,
	Body: StageShellBody,
	Footer: StageShellFooter,
});
