"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { ArrowUpRight, CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Moldura comum dos widgets do dashboard. Composição explícita (docs/frontend-target-architecture.md):
 * cada widget monta Root > Header + (Value | List | Empty | Loading | Error) + Details, sem flags de modo.
 *
 * Dois tamanhos, decididos pelo registro:
 * - compacto: o card inteiro é um link (`href` no Root) — o widget mostra, o módulo age.
 * - lista: o Root é um container; cada `Item` pode ser um link próprio e o Header leva o "ver todos".
 *   (Um link dentro de outro link é HTML inválido, por isso os dois modos não se misturam.)
 */

type HubWidgetRootProps = {
	/** Quando informado, o card inteiro vira link (modo compacto). */
	href?: string;
	/** Realce de atenção: o número principal fica em destaque (pendência que exige ação agora). */
	attention?: boolean;
	className?: string;
	children: ReactNode;
};

const rootClassName =
	"group/hub-widget bg-card border-border flex min-h-[9.5rem] w-full flex-col gap-3 rounded-xl border px-4 py-4 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function HubWidgetRoot({ href, attention = false, className, children }: HubWidgetRootProps) {
	const dataAttention = attention ? "" : undefined;
	if (href) {
		return (
			<Link href={href} data-attention={dataAttention} className={cn(rootClassName, "transition-colors hover:bg-muted/40", className)}>
				{children}
			</Link>
		);
	}
	return (
		<div data-attention={dataAttention} className={cn(rootClassName, className)}>
			{children}
		</div>
	);
}

type HubWidgetHeaderProps = {
	icon: ReactNode;
	title: string;
	/** Complemento discreto à direita do título (ex.: "HOJE", "7 DIAS"). */
	hint?: string;
	/** Modo lista: link "ver todos" para a tela do módulo. */
	href?: string;
	hrefLabel?: string;
};

function HubWidgetHeader({ icon, title, hint, href, hrefLabel = "Ver todos" }: HubWidgetHeaderProps) {
	return (
		// O título nunca cede: quem encolhe (e trunca) em tela estreita é o complemento à direita.
		<div className="flex w-full items-center justify-between gap-2">
			<div className="flex shrink-0 items-center gap-2 text-muted-foreground [&>svg]:size-4">
				{icon}
				<h3 className="text-label text-foreground">{title}</h3>
			</div>
			<div className="text-micro flex min-w-0 items-center justify-end gap-2 text-muted-foreground">
				{hint ? <span className="truncate">{hint}</span> : null}
				{href ? (
					<Link
						href={href}
						className="flex shrink-0 items-center gap-0.5 rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{hrefLabel}
						<ArrowUpRight className="size-3.5" aria-hidden />
					</Link>
				) : (
					<ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover/hub-widget:opacity-100" aria-hidden />
				)}
			</div>
		</div>
	);
}

type HubWidgetValueProps = {
	children: ReactNode;
	/** Legenda curta abaixo do valor. */
	label?: string;
};

function HubWidgetValue({ children, label }: HubWidgetValueProps) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-2xl font-black leading-none tracking-tight group-data-[attention]/hub-widget:text-destructive">{children}</span>
			{label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
		</div>
	);
}

function HubWidgetDetails({ children }: { children: ReactNode }) {
	return <dl className="mt-auto flex flex-col gap-1">{children}</dl>;
}

type HubWidgetTone = "default" | "destructive" | "success";

const toneClassName: Record<HubWidgetTone, string> = {
	default: "",
	destructive: "text-destructive",
	success: "text-success",
};

type HubWidgetDetailProps = {
	label: string;
	value: ReactNode;
	tone?: HubWidgetTone;
};

function HubWidgetDetail({ label, value, tone = "default" }: HubWidgetDetailProps) {
	return (
		<div className="flex items-center justify-between gap-3 text-xs">
			<dt className="truncate text-muted-foreground">{label}</dt>
			<dd className={cn("shrink-0 font-semibold tabular-nums", toneClassName[tone])}>{value}</dd>
		</div>
	);
}

/** Lista de itens nomeados (modo lista). Cabe em ~5 linhas; o excedente fica atrás do "ver todos". */
function HubWidgetList({ children }: { children: ReactNode }) {
	return <ul className="-mx-2 flex flex-col">{children}</ul>;
}

type HubWidgetItemProps = {
	/** Nome do item: cliente, pedido, produto, documento. */
	primary: ReactNode;
	/** Contexto em uma linha: motivo, canal, há quanto tempo. */
	secondary?: ReactNode;
	/** Valor à direita: dinheiro, contagem, prazo. */
	trailing?: ReactNode;
	tone?: HubWidgetTone;
	/** Quando informado, a linha vira link para a tela do item. */
	href?: string;
	/** Marcador colorido à esquerda (ex.: segmento RFM); identidade vem do marcador, nunca da cor do texto. */
	leading?: ReactNode;
};

function HubWidgetItem({ primary, secondary, trailing, tone = "default", href, leading }: HubWidgetItemProps) {
	const content = (
		<>
			{leading ? <span className="flex size-6 shrink-0 items-center justify-center">{leading}</span> : null}
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-sm font-semibold leading-tight text-foreground">{primary}</span>
				{secondary ? <span className="text-micro truncate text-muted-foreground">{secondary}</span> : null}
			</span>
			{trailing !== undefined && trailing !== null ? (
				<span className={cn("shrink-0 text-xs font-semibold tabular-nums", toneClassName[tone])}>{trailing}</span>
			) : null}
		</>
	);
	const rowClassName = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5";
	return (
		<li className="flex">
			{href ? (
				<Link
					href={href}
					className={cn(rowClassName, "transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
				>
					{content}
				</Link>
			) : (
				<div className={rowClassName}>{content}</div>
			)}
		</li>
	);
}

/** Estado "nada a fazer": calmo de propósito — a ausência de pendência é a boa notícia. */
function HubWidgetEmpty({ message }: { message: string }) {
	return (
		<div className="flex items-center gap-2 text-sm text-muted-foreground">
			<CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
			<span>{message}</span>
		</div>
	);
}

function HubWidgetLoading({ rows = 2 }: { rows?: number }) {
	return (
		<div className="flex flex-col gap-3" aria-busy>
			<Skeleton className="h-7 w-24 rounded-md" />
			{Array.from({ length: rows }, (_, index) => (
				<Skeleton key={index} className={cn("h-3 rounded", index % 2 === 0 ? "w-32" : "w-40")} />
			))}
		</div>
	);
}

function HubWidgetError({ error }: { error: unknown }) {
	return (
		<div className="flex items-start gap-2 text-xs text-destructive">
			<TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
			<span className="line-clamp-2">{getErrorMessage(error)}</span>
		</div>
	);
}

export const HubWidget = Object.assign(HubWidgetRoot, {
	Header: HubWidgetHeader,
	Value: HubWidgetValue,
	Details: HubWidgetDetails,
	Detail: HubWidgetDetail,
	List: HubWidgetList,
	Item: HubWidgetItem,
	Empty: HubWidgetEmpty,
	Loading: HubWidgetLoading,
	Error: HubWidgetError,
});
