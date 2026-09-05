"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

type DetailsSectionProps = {
	title: string;
	count?: number;
	action?: ReactNode;
	className?: string;
	children: ReactNode;
};

/**
 * Bloco do menu de detalhes do documento fiscal. Mesmo vocabulario das secoes do pedido
 * (SaleFulfillmentDetailsMenu): cabecalho de 48px com titulo em sentence case e contagem opcional,
 * conteudo sem padding proprio para que cada secao decida linhas, tabelas ou listas.
 */
export function DetailsSection({ title, count, action, className, children }: DetailsSectionProps) {
	return (
		<section className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
			<div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
				<div className="flex min-w-0 items-center gap-2">
					<h3 className="truncate text-sm font-extrabold">{title}</h3>
					{count !== undefined ? <span className="text-xs font-bold tabular-nums text-muted-foreground">{count}</span> : null}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

export function DetailsEmptyLine({ children }: { children: ReactNode }) {
	return <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">{children}</p>;
}

type DetailRowProps = {
	label: string;
	value: string | null | undefined;
	copyable?: boolean;
};

/** Linha rotulo/valor de uma `<dl>`. Valor ausente vira travessao, nunca campo vazio. */
export function DetailRow({ label, value, copyable = false }: DetailRowProps) {
	const text = value?.trim() ? value : null;
	return (
		<div className="flex items-start justify-between gap-4 py-2">
			<dt className="shrink-0 text-xs font-semibold text-muted-foreground">{label}</dt>
			<dd className="flex min-w-0 items-start justify-end gap-1 text-right">
				<span className={cn("min-w-0 break-all text-xs font-bold tabular-nums", !text && "text-muted-foreground")}>{text ?? "—"}</span>
				{copyable && text ? <CopyValueButton value={text} label={`Copiar ${label.toLowerCase()}`} className="-my-1" /> : null}
			</dd>
		</div>
	);
}

/** Copia para a area de transferencia e confirma trocando o icone por 1,5 s. */
export function CopyValueButton({ value, label, className }: { value: string; label: string; className?: string }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timeout = window.setTimeout(() => setCopied(false), 1500);
		return () => window.clearTimeout(timeout);
	}, [copied]);

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
		} catch {
			toast.error("Não foi possível copiar.");
		}
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			onClick={copy}
			aria-label={label}
			title={label}
			className={cn("shrink-0 rounded-lg text-muted-foreground hover:text-foreground", className)}
		>
			{copied ? <Check className="text-success" /> : <Copy />}
			<span className="sr-only" aria-live="polite">
				{copied ? "Copiado" : ""}
			</span>
		</Button>
	);
}
