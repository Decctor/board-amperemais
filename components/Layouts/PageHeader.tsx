"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Cabeçalho de página de detalhe: voltar e ações em cima, título e descrição embaixo.
 *
 * Cada página de entidade tinha inventado o seu — quatro tratamentos diferentes para o botão
 * voltar (ghost, outline, ícone puro, pílula com hover de marca) e três tamanhos de `<h1>` para a
 * mesma hierarquia. A volta é sempre um `ghost` discreto: sair da tela não é a ação principal
 * dela. O título segue o `DESIGN.md §3`, sentence case; quem escreve em CAIXA ALTA está usando
 * rótulo no lugar de título.
 */

function PageHeaderRoot({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="page-header" className={cn("flex w-full flex-col gap-2", className)}>
			{children}
		</div>
	);
}

/** Linha superior: voltar à esquerda, ações à direita. */
function PageHeaderBar({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="page-header-bar" className={cn("flex w-full flex-wrap items-center justify-between gap-2", className)}>
			{children}
		</div>
	);
}

function PageHeaderBack({ href, className, children = "Voltar" }: { href: string; className?: string; children?: ReactNode }) {
	return (
		<Button variant="ghost" size="sm" asChild className={cn("flex w-fit items-center gap-1.5 px-2", className)}>
			<Link href={href}>
				<ArrowLeft className="size-4 min-h-4 min-w-4" />
				{children}
			</Link>
		</Button>
	);
}

function PageHeaderActions({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="page-header-actions" className={cn("flex shrink-0 items-center gap-1.5", className)}>
			{children}
		</div>
	);
}

function PageHeaderHeading({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="page-header-heading" className={cn("flex min-w-0 flex-col", className)}>
			{children}
		</div>
	);
}

function PageHeaderTitle({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<h1 data-slot="page-header-title" className={cn("flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight", className)}>
			{children}
		</h1>
	);
}

function PageHeaderDescription({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<p data-slot="page-header-description" className={cn("text-sm text-muted-foreground", className)}>
			{children}
		</p>
	);
}

export const PageHeader = {
	Root: PageHeaderRoot,
	Bar: PageHeaderBar,
	Back: PageHeaderBack,
	Actions: PageHeaderActions,
	Heading: PageHeaderHeading,
	Title: PageHeaderTitle,
	Description: PageHeaderDescription,
};
