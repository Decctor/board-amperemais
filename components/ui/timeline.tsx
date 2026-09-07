"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

/**
 * Linha do tempo de eventos: o que aconteceu com um documento, uma execução, uma importação.
 *
 * A geometria é o motivo do primitive existir. O fio vertical nasce logo abaixo do marcador e
 * morre no fim do item, o marcador tem anel na cor do cartão para "furar" o fio, e o último item
 * não desenha fio nenhum — três detalhes que, refeitos a olho, saem diferentes toda vez. Aqui o
 * "último" é resolvido em CSS (`group-last`), então o callsite não precisa de índice.
 *
 * Tom no marcador é semântico e escasso: só o evento que mudou o destino do registro ganha cor.
 * Uma linha do tempo colorida do começo ao fim não hierarquiza nada.
 */

const markerToneVariants = cva("", {
	variants: {
		tone: {
			neutral: "bg-muted-foreground/50",
			success: "bg-success",
			danger: "bg-destructive",
			warning: "bg-warning",
			info: "bg-info",
			brand: "bg-brand",
			/** Fim definitivo sem juízo de valor — cancelamento, inutilização. */
			strong: "bg-foreground",
		},
	},
	defaultVariants: { tone: "neutral" },
});

export type TTimelineTone = NonNullable<VariantProps<typeof markerToneVariants>["tone"]>;

function TimelineRoot({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<ol data-slot="timeline" className={cn("flex w-full flex-col", className)}>
			{children}
		</ol>
	);
}

function TimelineItem({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<li data-slot="timeline-item" className={cn("group relative flex gap-3 pb-4 last:pb-0", className)}>
			{children}
		</li>
	);
}

/** Fio que liga um item ao próximo. Absoluto em relação ao `Item`, some no último. */
function Connector({ className }: { className: string }) {
	return <span aria-hidden className={cn("absolute bottom-0 w-px bg-border group-last:hidden", className)} />;
}

/** Marcador padrão: ponto de 11px. Use quando o tipo do evento já está escrito no título. */
function TimelineDot({ tone, className }: VariantProps<typeof markerToneVariants> & { className?: string }) {
	return (
		<>
			<Connector className="top-3.5 left-[5px]" />
			<span
				data-slot="timeline-dot"
				className={cn("mt-1 size-[11px] shrink-0 rounded-full ring-2 ring-card", markerToneVariants({ tone }), className)}
			/>
		</>
	);
}

/** Marcador com ícone, para quando o próprio ícone carrega o estado (sucesso, falha, execução). */
function TimelineIcon({ tone, className, children }: VariantProps<typeof markerToneVariants> & { className?: string; children: ReactNode }) {
	return (
		<>
			<Connector className="top-7 left-[11.5px]" />
			<span
				data-slot="timeline-icon"
				className={cn(
					"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ring-2 ring-card [&_svg]:size-3.5",
					markerToneVariants({ tone }),
					className,
				)}
			>
				{children}
			</span>
		</>
	);
}

function TimelineContent({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="timeline-content" className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}>
			{children}
		</div>
	);
}

/** Título e horário na mesma linha de base; quebram um sob o outro quando não cabem. */
function TimelineHeader({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="timeline-header" className={cn("flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5", className)}>
			{children}
		</div>
	);
}

function TimelineTitle({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<p data-slot="timeline-title" className={cn("text-xs font-bold", className)}>
			{children}
		</p>
	);
}

function TimelineTime({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<span data-slot="timeline-time" className={cn("text-micro tabular-nums text-muted-foreground", className)}>
			{children}
		</span>
	);
}

function TimelineDescription({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<p data-slot="timeline-description" className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
			{children}
		</p>
	);
}

/** Rodapé do item: autor, origem, identificador — quem assinou o evento. */
function TimelineMeta({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<p data-slot="timeline-meta" className={cn("text-micro text-muted-foreground", className)}>
			{children}
		</p>
	);
}

export const Timeline = {
	Root: TimelineRoot,
	Item: TimelineItem,
	Dot: TimelineDot,
	Icon: TimelineIcon,
	Content: TimelineContent,
	Header: TimelineHeader,
	Title: TimelineTitle,
	Time: TimelineTime,
	Description: TimelineDescription,
	Meta: TimelineMeta,
};
