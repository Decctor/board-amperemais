"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, X } from "lucide-react";

type ActionToastProps = {
	message: string;
	actionLabel: string;
	onAction: () => void;
	onDismiss: () => void;
	className?: string;
};

export function ActionToast({ message, actionLabel, onAction, onDismiss, className }: ActionToastProps) {
	return (
		<div
			className={cn(
				"relative flex flex-col gap-3 w-[min(calc(100vw-2rem),22.5rem)] rounded-2xl border border-border bg-card p-4 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]",
				className,
			)}
		>
			<button
				type="button"
				onClick={onDismiss}
				className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				aria-label="Fechar notificação"
			>
				<X className="size-3.5" />
			</button>

			<div className="flex items-start gap-3 pr-8">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-500/12">
					<CheckCircle2 className="size-5 text-green-600" strokeWidth={2.25} />
				</div>
				<p className="pt-1 text-sm leading-snug font-medium text-foreground">{message}</p>
			</div>

			<Button type="button" variant={"brand"} size={"sm"} className="w-full" onClick={onAction}>
				{actionLabel}
			</Button>
		</div>
	);
}
