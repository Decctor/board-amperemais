"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { TGetFinancesDreOutput } from "@/app/api/finances/analytics/dre/route";
import { DeltaBadge } from "@/app/dashboard/finance/_components/delta-badge";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";

type TDreTreeNode = TGetFinancesDreOutput["data"]["demonstrativo"]["receita"]["arvore"][number];

function formatPercentOfRevenue(value: number, revenueTotal: number) {
	if (revenueTotal <= 0) return "—";
	return `${formatDecimalPlaces((value / revenueTotal) * 100, 1, 1)}%`;
}

type DreTreeRowsProps = {
	nodes: TDreTreeNode[];
	depth: number;
	revenueTotal: number;
	invertDelta: boolean;
};
function DreTreeRows({ nodes, depth, revenueTotal, invertDelta }: DreTreeRowsProps) {
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

	function toggleNode(accountId: string) {
		setExpandedNodes((prev) => {
			const next = new Set(prev);
			if (next.has(accountId)) next.delete(accountId);
			else next.add(accountId);
			return next;
		});
	}

	return (
		<>
			{nodes.map((node) => (
				<div key={node.contaId} className="flex w-full flex-col">
					<div
						className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
						style={{ paddingLeft: `${8 + depth * 16}px` }}
					>
						<div className="flex min-w-0 items-center gap-1">
							{node.filhos.length > 0 ? (
								<button
									type="button"
									onClick={() => toggleNode(node.contaId)}
									className="flex h-5 min-h-5 w-5 min-w-5 items-center justify-center rounded-full text-muted-foreground duration-300 ease-in-out hover:bg-primary/20 hover:text-foreground"
								>
									{expandedNodes.has(node.contaId) ? <ChevronDown width={12} height={12} /> : <ChevronRight width={12} height={12} />}
								</button>
							) : (
								<span className="h-5 w-5 min-w-5" />
							)}
							<h1 className="truncate text-xs font-medium leading-none tracking-tight text-muted-foreground">{node.nome}</h1>
						</div>
						<div className="flex shrink-0 items-center gap-3">
							<span className="w-12 text-right text-[0.65rem] font-medium text-muted-foreground tabular-nums">
								{formatPercentOfRevenue(node.total, revenueTotal)}
							</span>
							<DeltaBadge current={node.total} previous={node.totalAnterior} invert={invertDelta} />
							<h1 className="w-28 text-right text-xs font-medium tabular-nums">{formatToMoney(node.total)}</h1>
						</div>
					</div>
					{expandedNodes.has(node.contaId) && node.filhos.length > 0 ? (
						<DreTreeRows nodes={node.filhos} depth={depth + 1} revenueTotal={revenueTotal} invertDelta={invertDelta} />
					) : null}
				</div>
			))}
		</>
	);
}

type DreStatementLineProps = {
	label: string;
	prefix?: string;
	total: number;
	totalAnterior: number;
	revenueTotal: number;
	invertDelta?: boolean;
	emphasized?: boolean;
	margem?: number | null;
	tree?: TDreTreeNode[];
};
export function DreStatementLine({
	label,
	prefix,
	total,
	totalAnterior,
	revenueTotal,
	invertDelta = false,
	emphasized = false,
	margem,
	tree,
}: DreStatementLineProps) {
	const [expanded, setExpanded] = useState(false);
	const hasTree = !!tree && tree.length > 0;

	return (
		<div className={cn("flex w-full flex-col rounded-lg", { "bg-primary/5": emphasized })}>
			<div className="flex w-full items-center justify-between gap-2 px-2 py-2">
				<div className="flex min-w-0 items-center gap-1">
					{hasTree ? (
						<button
							type="button"
							onClick={() => setExpanded((prev) => !prev)}
							className={cn(
								"flex h-5 min-h-5 w-5 min-w-5 items-center justify-center rounded-full text-foreground duration-300 ease-in-out hover:bg-primary/20",
								{ "bg-primary/30": expanded },
							)}
						>
							{expanded ? <ChevronDown width={12} height={12} /> : <ChevronRight width={12} height={12} />}
						</button>
					) : (
						<span className="h-5 w-5 min-w-5" />
					)}
					<h1 className={cn("truncate text-xs leading-none tracking-tight", emphasized ? "font-bold" : "font-medium")}>
						{prefix ? <span className="text-muted-foreground">{prefix} </span> : null}
						{label}
					</h1>
					{margem !== undefined && margem !== null ? (
						<span
							className={cn("ml-1 rounded-md px-1.5 py-0.5 text-[0.6rem] font-medium tabular-nums", {
								"bg-green-500/10 text-green-700 dark:text-green-400": margem >= 0,
								"bg-red-500/10 text-red-700 dark:text-red-400": margem < 0,
							})}
						>
							MARGEM {formatDecimalPlaces(margem, 1, 1)}%
						</span>
					) : null}
				</div>
				<div className="flex shrink-0 items-center gap-3">
					<span className="w-12 text-right text-[0.65rem] font-medium text-muted-foreground tabular-nums">
						{formatPercentOfRevenue(total, revenueTotal)}
					</span>
					<DeltaBadge current={total} previous={totalAnterior} invert={invertDelta} />
					<h1 className={cn("w-28 text-right text-sm tabular-nums", emphasized ? "font-bold" : "font-medium")}>{formatToMoney(total)}</h1>
				</div>
			</div>
			{expanded && hasTree ? <DreTreeRows nodes={tree} depth={1} revenueTotal={revenueTotal} invertDelta={invertDelta} /> : null}
		</div>
	);
}
