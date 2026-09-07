"use client";

import { TONE_ACCENT_TEXT, toneSurfaceVariants, type TTone } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Bloco de aviso com tom semântico: o painel que diz o que aconteceu e o que fazer a respeito.
 *
 * O tom entra uma vez, na raiz, e as partes o herdam por variável CSS (`--tone-accent`) em vez de
 * cada uma repetir a matriz de cores. Só título, ícone e `Note` recebem a cor do tom: o corpo
 * continua em `foreground`, porque tingir o texto inteiro transforma um aviso em bloco decorativo
 * e derruba o contraste da própria mensagem.
 *
 * Os tons saem dos tokens de `DESIGN.md §2` — nunca de `rose-*`, `amber-*` ou `sky-*` no callsite.
 */

type CalloutRootProps = {
	tone?: TTone;
	className?: string;
	children: ReactNode;
};

function CalloutRoot({ tone = "neutral", className, children }: CalloutRootProps) {
	return (
		<section
			data-slot="callout"
			data-tone={tone}
			className={cn("flex w-full flex-col gap-2.5 rounded-lg border p-3", toneSurfaceVariants({ tone }), className)}
		>
			{children}
		</section>
	);
}

function CalloutTitle({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<h4 data-slot="callout-title" className={cn("flex items-center gap-1.5 text-label", TONE_ACCENT_TEXT, className)}>
			{children}
		</h4>
	);
}

function CalloutDescription({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<p data-slot="callout-description" className={cn("text-sm", className)}>
			{children}
		</p>
	);
}

/** Texto curto na cor do tom: o código da rejeição, o motivo de um bloqueio, o prazo que corre. */
function CalloutNote({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<p data-slot="callout-note" className={cn("flex items-start gap-1.5 text-xs font-semibold", TONE_ACCENT_TEXT, className)}>
			{children}
		</p>
	);
}

/** Conteúdo livre dentro do callout — listas de problemas, linhas de decisão, tabelas curtas. */
function CalloutBody({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="callout-body" className={cn("flex w-full flex-col gap-2 text-sm", className)}>
			{children}
		</div>
	);
}

function CalloutActions({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="callout-actions" className={cn("flex flex-wrap items-center gap-2 pt-1", className)}>
			{children}
		</div>
	);
}

export const Callout = {
	Root: CalloutRoot,
	Title: CalloutTitle,
	Description: CalloutDescription,
	Note: CalloutNote,
	Body: CalloutBody,
	Actions: CalloutActions,
};
