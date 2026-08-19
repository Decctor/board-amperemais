import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

// Tons semânticos da paleta fechada (DESIGN.md) — nada de verde/amarelo/vermelho crus do Tailwind.
export type TStatusTone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASSNAMES: Record<TStatusTone, string> = {
	success: "border-success/30 bg-success/10 text-success",
	warning: "border-brand/40 bg-brand/15 text-foreground",
	danger: "border-destructive/30 bg-destructive/10 text-destructive",
	neutral: "border-border bg-muted text-muted-foreground",
};

type StatusPillProps = PropsWithChildren & {
	tone: TStatusTone;
	className?: string;
};
// A pílula de status do módulo de acesso: credencial, disponibilidade de impressora, vínculo.
export function StatusPill({ tone, className, children }: StatusPillProps) {
	return (
		<span className={cn("rounded-full border px-2 py-1 text-[0.6rem] font-bold tracking-widest whitespace-nowrap", TONE_CLASSNAMES[tone], className)}>
			{children}
		</span>
	);
}

const PRINCIPAL_STATUS_TONES: Record<string, { label: string; tone: TStatusTone }> = {
	ATIVO: { label: "ATIVO", tone: "success" },
	INATIVO: { label: "INATIVO", tone: "warning" },
	REVOGADO: { label: "REVOGADO", tone: "danger" },
};

type AccessStatusBadgeProps = {
	status: string;
	className?: string;
};
export function AccessStatusBadge({ status, className }: AccessStatusBadgeProps) {
	const meta = PRINCIPAL_STATUS_TONES[status] ?? { label: status, tone: "neutral" as const };
	return (
		<StatusPill tone={meta.tone} className={className}>
			{meta.label}
		</StatusPill>
	);
}

export default AccessStatusBadge;
