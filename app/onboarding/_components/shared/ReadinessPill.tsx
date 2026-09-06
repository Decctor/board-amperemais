import type { TOnboardingDependencyStatusEnum } from "@/schemas/enums";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type TReadinessTone = "ok" | "andamento" | "pendente" | "falhou" | "adiado";

const TONE_CLASSES: Record<TReadinessTone, { pill: string; dot: string }> = {
	ok: { pill: "bg-success/10 text-success", dot: "bg-success" },
	andamento: { pill: "bg-muted text-foreground", dot: "bg-foreground/60" },
	// Único uso de âmbar entre os estados: "a bola está com você" (mesmo racional do ABERTO no hub).
	pendente: { pill: "bg-brand/15 text-brand-foreground dark:text-foreground", dot: "bg-brand" },
	falhou: { pill: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
	adiado: { pill: "bg-muted/60 text-muted-foreground", dot: "bg-muted-foreground/60" },
};

export function toneFromDependencyStatus(status: TOnboardingDependencyStatusEnum): TReadinessTone {
	switch (status) {
		case "OK":
		case "NAO_APLICAVEL":
			return "ok";
		case "EM_ANALISE":
			return "andamento";
		case "FALHOU":
			return "falhou";
		default:
			return "pendente";
	}
}

export function ReadinessPill({ tone, children, className }: { tone: TReadinessTone; children: ReactNode; className?: string }) {
	const classes = TONE_CLASSES[tone];
	return (
		<span
			className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap", classes.pill, className)}
		>
			<span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", classes.dot)} />
			{children}
		</span>
	);
}
