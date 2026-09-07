"use client";

import { TONE_ACCENT_TEXT, toneSurfaceVariants, type TTone } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Célula de indicador: rótulo pequeno em caixa alta sobre um número confiante em `tabular-nums`
 * (`DESIGN.md §5 — Stats / KPI cells`). A spec existia desde o começo e nenhum componente a
 * implementava, então cada página remontava a sua — daí os dois `StatCell` e a faixa de resumo
 * do painel fiscal, todos com tamanhos ligeiramente diferentes.
 *
 * `surface` é opcional: sem ela o indicador é só texto dentro de um cartão que já existe; com
 * ela vira a caixinha com tom (o valor travado que está em vermelho porque é um problema).
 */

type MetricRootProps = {
	/** `plain` (padrão) não desenha caixa; qualquer outro tom desenha a superfície suave. */
	tone?: TTone;
	surface?: boolean;
	align?: "start" | "end";
	className?: string;
	children: ReactNode;
};

function MetricRoot({ tone = "plain", surface = false, align = "start", className, children }: MetricRootProps) {
	return (
		<div
			data-slot="metric"
			className={cn(
				"flex flex-col gap-0.5",
				align === "end" && "items-end text-right",
				surface && "rounded-lg border px-3 py-2",
				toneSurfaceVariants({ tone }),
				className,
			)}
		>
			{children}
		</div>
	);
}

function MetricLabel({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<span data-slot="metric-label" className={cn("text-label text-muted-foreground", className)}>
			{children}
		</span>
	);
}

type MetricValueProps = {
	/** `md` para linhas de resumo, `lg` para o número que a tela existe para mostrar. */
	size?: "sm" | "md" | "lg";
	toned?: boolean;
	className?: string;
	children: ReactNode;
};

function MetricValue({ size = "md", toned = false, className, children }: MetricValueProps) {
	return (
		<span
			data-slot="metric-value"
			className={cn(
				"font-extrabold tracking-tight tabular-nums",
				size === "sm" && "text-base",
				size === "md" && "text-lg",
				size === "lg" && "text-2xl",
				toned && TONE_ACCENT_TEXT,
				className,
			)}
		>
			{children}
		</span>
	);
}

function MetricHint({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<span data-slot="metric-hint" className={cn("text-micro text-muted-foreground", className)}>
			{children}
		</span>
	);
}

export const Metric = {
	Root: MetricRoot,
	Label: MetricLabel,
	Value: MetricValue,
	Hint: MetricHint,
};
