"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { ArrowUpRight, CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Moldura comum dos widgets do dashboard. Composição explícita (docs/frontend-target-architecture.md):
 * cada widget monta Root > Header + (Value | Empty | Loading | Error) + Details, sem flags de modo.
 *
 * O card inteiro é um link para a tela do módulo que resolve o assunto — o widget mostra, o módulo age.
 */

type HubWidgetRootProps = {
	href: string;
	/** Realce de atenção: o número principal fica em destaque (pendência que exige ação agora). */
	attention?: boolean;
	className?: string;
	children: ReactNode;
};

function HubWidgetRoot({ href, attention = false, className, children }: HubWidgetRootProps) {
	return (
		<Link
			href={href}
			data-attention={attention ? "" : undefined}
			className={cn(
				"group/hub-widget bg-card border-border flex min-h-[9.5rem] w-full flex-col gap-3 rounded-xl border px-4 py-4 shadow-2xs transition-colors hover:bg-muted/40",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				className,
			)}
		>
			{children}
		</Link>
	);
}

type HubWidgetHeaderProps = {
	icon: ReactNode;
	title: string;
	/** Complemento discreto à direita do título (ex.: "HOJE", "7 DIAS"). */
	hint?: string;
};

function HubWidgetHeader({ icon, title, hint }: HubWidgetHeaderProps) {
	return (
		<div className="flex w-full items-center justify-between gap-2">
			<div className="flex min-w-0 items-center gap-2">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary [&>svg]:size-4">{icon}</span>
				<h2 className="truncate text-xs font-bold uppercase tracking-wide text-foreground">{title}</h2>
			</div>
			<div className="flex shrink-0 items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
				{hint ? <span>{hint}</span> : null}
				<ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover/hub-widget:opacity-100" aria-hidden />
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
			<span className="text-2xl font-black leading-none tracking-tight tabular-nums group-data-[attention]/hub-widget:text-destructive">{children}</span>
			{label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
		</div>
	);
}

function HubWidgetDetails({ children }: { children: ReactNode }) {
	return <dl className="mt-auto flex flex-col gap-1">{children}</dl>;
}

type HubWidgetDetailProps = {
	label: string;
	value: ReactNode;
	tone?: "default" | "destructive" | "success";
};

function HubWidgetDetail({ label, value, tone = "default" }: HubWidgetDetailProps) {
	return (
		<div className="flex items-center justify-between gap-3 text-xs">
			<dt className="truncate text-muted-foreground">{label}</dt>
			<dd
				className={cn(
					"shrink-0 font-semibold tabular-nums",
					tone === "destructive" && "text-destructive",
					tone === "success" && "text-emerald-600 dark:text-emerald-400",
				)}
			>
				{value}
			</dd>
		</div>
	);
}

/** Estado "nada a fazer": calmo de propósito — a ausência de pendência é a boa notícia. */
function HubWidgetEmpty({ message }: { message: string }) {
	return (
		<div className="flex items-center gap-2 text-sm text-muted-foreground">
			<CircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
			<span>{message}</span>
		</div>
	);
}

function HubWidgetLoading() {
	return (
		<div className="flex flex-col gap-3" aria-busy>
			<Skeleton className="h-7 w-24 rounded-md" />
			<Skeleton className="h-3 w-32 rounded" />
			<Skeleton className="h-3 w-40 rounded" />
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
	Empty: HubWidgetEmpty,
	Loading: HubWidgetLoading,
	Error: HubWidgetError,
});
