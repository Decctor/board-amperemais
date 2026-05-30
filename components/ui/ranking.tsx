"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Crown, Minus, type LucideIcon } from "lucide-react";
import { createContext, use, type ComponentProps, type ReactNode } from "react";

const RANK_CARD_STYLES: Record<1 | 2 | 3, string> = {
	1: "border-brand/45 bg-brand/[0.07] shadow-[inset_0_1px_0_0_rgba(255,185,0,0.14)] hover:border-brand/60",
	2: "border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/45",
	3: "border-orange-600/35 bg-orange-600/[0.06] hover:border-orange-600/50",
};

const RANK_CROWN_STYLES: Record<1 | 2 | 3, string> = {
	1: "text-brand drop-shadow-[0_0_6px_rgba(255,185,0,0.45)]",
	2: "text-muted-foreground drop-shadow-[0_0_4px_rgba(163,163,163,0.35)]",
	3: "text-orange-600 drop-shadow-[0_0_4px_rgba(234,88,12,0.35)]",
};

const RANK_METRIC_STYLES: Record<1 | 2 | 3, string> = {
	1: "bg-brand/15 text-foreground",
	2: "bg-muted/50 text-foreground",
	3: "bg-orange-600/10 text-foreground",
};

type RankingItemContextValue = {
	rank: number;
};

const RankingItemContext = createContext<RankingItemContextValue | null>(null);

function useRankingItemContext() {
	const context = use(RankingItemContext);
	if (!context) {
		throw new Error("Ranking item subcomponents must be used within RankingItem.");
	}
	return context;
}

function getRankingItemClassName(rank: number) {
	return cn(
		"group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2.5 gap-y-0.5 rounded-xl border px-3 py-2.5 shadow-2xs transition-[border-color,background-color] duration-200 ease-out lg:grid-cols-[auto_auto_minmax(0,1fr)_auto]",
		"bg-card border-border hover:border-primary/20",
		rank === 1 && RANK_CARD_STYLES[1],
		rank === 2 && RANK_CARD_STYLES[2],
		rank === 3 && RANK_CARD_STYLES[3],
	);
}

function RankingItemRankBadge({ rank }: { rank: number }) {
	if (rank <= 3) {
		return (
			<Crown
				className={cn(
					"h-5 w-5 min-h-5 min-w-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none",
					RANK_CROWN_STYLES[rank as 1 | 2 | 3],
				)}
			/>
		);
	}

	return (
		<div className="flex h-6 w-6 min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
			<span className="text-xs font-bold tabular-nums">{rank}</span>
		</div>
	);
}

function RankingRoot({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("flex h-full w-full flex-col gap-2 py-2", className)} {...props} />;
}

function RankingPanel({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("bg-card border-border flex h-full w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs", className)}
			{...props}
		/>
	);
}

function RankingHeader({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("flex shrink-0 flex-wrap items-center justify-between gap-2", className)} {...props} />;
}

function RankingTitle({ className, ...props }: ComponentProps<"h2">) {
	return <h2 className={cn("text-xs font-medium tracking-tight uppercase", className)} {...props} />;
}

function RankingActions({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("flex items-center gap-2", className)} {...props} />;
}

function RankingList({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex min-h-0 w-full flex-1 flex-col gap-2 overflow-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30",
				className,
			)}
			{...props}
		/>
	);
}

function RankingLoading({ className, ...props }: ComponentProps<"div">) {
	return (
		<div className={cn("flex w-full items-center justify-center py-8", className)} {...props}>
			<p className="text-sm text-muted-foreground">Carregando ranking...</p>
		</div>
	);
}

function RankingEmpty({ className, children, ...props }: ComponentProps<"div">) {
	return (
		<div className={cn("flex w-full items-center justify-center py-8", className)} {...props}>
			<p className="text-sm text-muted-foreground">{children}</p>
		</div>
	);
}

type RankingSortButtonProps = {
	active: boolean;
	tooltip: string;
	onClick: () => void;
	children: ReactNode;
};

function RankingSortButton({ active, tooltip, onClick, children }: RankingSortButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant={active ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={onClick}>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>{tooltip}</p>
			</TooltipContent>
		</Tooltip>
	);
}

type RankingItemProps = ComponentProps<"div"> & {
	rank: number;
};

function RankingItem({ rank, className, children, ...props }: RankingItemProps) {
	return (
		<RankingItemContext value={{ rank }}>
			<div className={cn(getRankingItemClassName(rank), className)} {...props}>
				<div className="col-start-1 row-start-1 row-span-2 self-center">
					<RankingItemRankBadge rank={rank} />
				</div>
				{children}
			</div>
		</RankingItemContext>
	);
}

function RankingItemMedia({ className, children, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"relative col-start-2 row-start-1 row-span-2 hidden h-8 w-8 min-h-8 min-w-8 shrink-0 self-center overflow-hidden rounded-lg lg:block",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

type RankingItemTitleProps = ComponentProps<"p"> & {
	tooltip?: string;
};

function RankingItemTitle({ tooltip, className, children, ...props }: RankingItemTitleProps) {
	const title = (
		<p className={cn("min-w-0 truncate text-left text-xs font-bold tracking-tight lg:text-sm", className)} {...props}>
			{children}
		</p>
	);

	if (!tooltip) return title;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{title}</TooltipTrigger>
			<TooltipContent>
				<p>{tooltip}</p>
			</TooltipContent>
		</Tooltip>
	);
}

function RankingItemDelta({ rankDelta, className }: { rankDelta: number | null; className?: string }) {
	if (rankDelta === null) return null;

	if (rankDelta === 0) {
		return (
			<div
				className={cn(
					"flex shrink-0 items-center gap-0.5 rounded-full bg-muted/60 px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground",
					className,
				)}
			>
				<Minus className="h-3 w-3 min-h-3 min-w-3" />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums",
				rankDelta > 0 && "bg-green-500/10 text-green-600 dark:text-green-400",
				rankDelta < 0 && "bg-red-500/10 text-red-600 dark:text-red-400",
				className,
			)}
		>
			{rankDelta > 0 ? (
				<>
					<ArrowUp className="h-3 w-3 min-h-3 min-w-3" />
					<span>+{rankDelta}</span>
				</>
			) : (
				<>
					<ArrowDown className="h-3 w-3 min-h-3 min-w-3" />
					<span>{rankDelta}</span>
				</>
			)}
		</div>
	);
}

function RankingItemTitleRow({ className, children, ...props }: ComponentProps<"div">) {
	return (
		<div className={cn("col-start-2 row-start-1 flex min-w-0 items-center gap-1.5 lg:col-start-3", className)} {...props}>
			{children}
		</div>
	);
}

type RankingItemMetaProps = ComponentProps<"div"> & {
	icon?: LucideIcon;
};

function RankingItemMeta({ icon: Icon, className, children, ...props }: RankingItemMetaProps) {
	return (
		<div
			className={cn("col-start-2 row-start-2 flex min-w-0 items-center gap-1 text-muted-foreground lg:col-start-3", className)}
			{...props}
		>
			{Icon ? <Icon className="h-3 w-3 min-h-3 min-w-3 shrink-0 opacity-60" /> : null}
			{typeof children === "string" ? (
				<span className="truncate text-[0.65rem] font-medium tabular-nums">{children}</span>
			) : (
				children
			)}
		</div>
	);
}

type RankingItemMetricProps = {
	icon: LucideIcon;
	value: string;
	className?: string;
};

function RankingItemMetric({ icon: Icon, value, className }: RankingItemMetricProps) {
	const { rank } = useRankingItemContext();

	return (
		<div className="col-start-3 row-start-1 justify-self-end lg:col-start-4">
			<div
				className={cn(
					"flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[0.65rem] font-bold",
					className ?? (rank <= 3 ? RANK_METRIC_STYLES[rank as 1 | 2 | 3] : "bg-primary/10 text-foreground"),
				)}
			>
				<Icon className="h-3 w-3 min-h-3 min-w-3 shrink-0 opacity-80" />
				<p className="text-xs font-bold tracking-tight tabular-nums">{value}</p>
			</div>
		</div>
	);
}

function RankingItemComparison({ value, className }: { value: string | null; className?: string }) {
	if (value === null) return null;

	return (
		<div
			className={cn(
				"col-start-3 row-start-2 justify-self-end text-[0.6rem] text-muted-foreground tabular-nums lg:col-start-4",
				className,
			)}
		>
			<span>Anterior: {value}</span>
		</div>
	);
}

function RankingProvider({ children }: { children: ReactNode }) {
	return <TooltipProvider>{children}</TooltipProvider>;
}

export const Ranking = {
	Root: RankingRoot,
	Panel: RankingPanel,
	Provider: RankingProvider,
	Header: RankingHeader,
	Title: RankingTitle,
	Actions: RankingActions,
	SortButton: RankingSortButton,
	List: RankingList,
	Loading: RankingLoading,
	Empty: RankingEmpty,
	Item: RankingItem,
	ItemMedia: RankingItemMedia,
	ItemTitle: RankingItemTitle,
	ItemTitleRow: RankingItemTitleRow,
	ItemDelta: RankingItemDelta,
	ItemMeta: RankingItemMeta,
	ItemMetric: RankingItemMetric,
	ItemComparison: RankingItemComparison,
};

export {
	RankingRoot,
	RankingPanel,
	RankingProvider,
	RankingHeader,
	RankingTitle,
	RankingActions,
	RankingSortButton,
	RankingList,
	RankingLoading,
	RankingEmpty,
	RankingItem,
	RankingItemMedia,
	RankingItemTitle,
	RankingItemTitleRow,
	RankingItemDelta,
	RankingItemMeta,
	RankingItemMetric,
	RankingItemComparison,
};
