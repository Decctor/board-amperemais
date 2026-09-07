"use client";

import { cn } from "@/lib/utils";
import { createContext, use, type ReactNode } from "react";

/**
 * Lista rótulo/valor — a `<dl>` que o app reescrevia em cinco lugares (`DetailRow` do módulo
 * fiscal, `SectionWrapperDataRow`, dois `InfoRow`, dois `StatCell`).
 *
 * Dois layouts, porque são dois problemas diferentes e não dois gostos:
 * - `justified`: rótulo à esquerda, valor à direita, para painéis de identificação onde os valores
 *   são longos e comparáveis na vertical (protocolo, chave, datas);
 * - `inline`: ícone + rótulo + valor na mesma linha, para linhas curtas dentro de uma seção.
 *
 * `Value` sem conteúdo vira travessão. Campo vazio nunca deve parecer campo faltando.
 */

type DataListLayout = "justified" | "inline";

const DataListContext = createContext<DataListLayout>("justified");

function useDataListLayout() {
	return use(DataListContext);
}

type DataListRootProps = {
	layout?: DataListLayout;
	className?: string;
	children: ReactNode;
};

function DataListRoot({ layout = "justified", className, children }: DataListRootProps) {
	return (
		<DataListContext value={layout}>
			<dl data-slot="data-list" className={cn("flex w-full flex-col", layout === "inline" && "gap-1.5", className)}>
				{children}
			</dl>
		</DataListContext>
	);
}

function DataListItem({ className, children }: { className?: string; children: ReactNode }) {
	const layout = useDataListLayout();
	return (
		<div
			data-slot="data-list-item"
			className={cn(layout === "justified" ? "flex items-start justify-between gap-4 py-2" : "flex w-full items-center gap-1.5", className)}
		>
			{children}
		</div>
	);
}

function DataListLabel({ icon, className, children }: { icon?: ReactNode; className?: string; children: ReactNode }) {
	const layout = useDataListLayout();
	return (
		<dt
			data-slot="data-list-label"
			className={cn(
				"flex shrink-0 items-center gap-1.5 text-muted-foreground",
				layout === "justified" ? "text-xs font-semibold" : "text-sm font-semibold tracking-tighter",
				className,
			)}
		>
			{icon}
			{children}
		</dt>
	);
}

/**
 * O estilo do valor fica no próprio `<dd>`, não num `<span>` interno: assim uma string simples e
 * uma string acompanhada de `CopyButton` saem iguais, sem o callsite ter que reproduzir a
 * tipografia quando precisa de mais de um filho.
 */
function DataListValue({ className, children }: { className?: string; children: ReactNode }) {
	const layout = useDataListLayout();
	const isEmpty = children == null || children === false || (typeof children === "string" && children.trim() === "");
	return (
		<dd
			data-slot="data-list-value"
			className={cn(
				"flex min-w-0 items-start gap-1",
				layout === "justified" ? "justify-end break-all text-right text-xs font-bold tabular-nums" : "justify-start text-sm font-semibold tracking-tight",
				isEmpty && "text-muted-foreground",
				className,
			)}
		>
			{isEmpty ? "—" : children}
		</dd>
	);
}

/**
 * Linha solta de ícone + rótulo + valor, sem `Root`.
 *
 * Existe porque a maioria dos callsites herdados é uma linha só, no meio de outro conteúdo — e um
 * `<dt>`/`<dd>` fora de uma `<dl>` é HTML inválido. Para um grupo de linhas, prefira
 * `Root layout="inline"` + `Item`: aí a lista é uma lista de verdade também na semântica.
 */
function DataListLine({ icon, label, value, className }: { icon?: ReactNode; label: ReactNode; value: ReactNode; className?: string }) {
	return (
		<div data-slot="data-list-line" className={cn("flex w-full items-center gap-1.5", className)}>
			{icon}
			<span className="shrink-0 text-sm font-semibold tracking-tighter text-foreground/80">{label}</span>
			<span className="min-w-0 text-sm font-semibold tracking-tight">{value}</span>
		</div>
	);
}

export const DataList = {
	Root: DataListRoot,
	Item: DataListItem,
	Label: DataListLabel,
	Value: DataListValue,
	Line: DataListLine,
};
