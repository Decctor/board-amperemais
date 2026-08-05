"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { TGetFinancialAccountsOutputDefault } from "@/app/api/finances/financial-accounts/route";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatToMoney } from "@/lib/formatting";
import { useFinancialAccountGraph } from "@/lib/queries/finances";
import { cn } from "@/lib/utils";

type AccountCardGraphType = "entries-and-exits" | "entries" | "exits" | "consolidated";

const GRAPH_TYPE_OPTIONS: { value: AccountCardGraphType; icon: ReactNode; label: string }[] = [
	{ value: "entries-and-exits", icon: <ArrowUpDown className="h-3 w-3" />, label: "Entradas e Saídas" },
	{ value: "entries", icon: <ArrowUp className="h-3 w-3" />, label: "Entradas" },
	{ value: "exits", icon: <ArrowDown className="h-3 w-3" />, label: "Saídas" },
	{ value: "consolidated", icon: <TrendingUp className="h-3 w-3" />, label: "Resultado líquido" },
];

const GRAPH_TYPE_LABELS: Record<AccountCardGraphType, string> = {
	"entries-and-exits": "Entradas vs Saídas",
	entries: "Entradas",
	exits: "Saídas",
	consolidated: "Resultado líquido",
};

type AccountCardChartProps = {
	accountId: string;
	accountType: TGetFinancialAccountsOutputDefault["accounts"][number]["tipo"];
	startDate: Date | null;
	endDate: Date | null;
};
export function AccountCardChart({ accountId, accountType, startDate, endDate }: AccountCardChartProps) {
	const [graphType, setGraphType] = useState<AccountCardGraphType>("entries-and-exits");
	const { data, isLoading } = useFinancialAccountGraph({ contaFinanceiraId: accountId, startDate, endDate });

	const consolidatedData = useMemo(
		() => data?.map((d) => ({ ...d, net: accountType === "CARTAO_CREDITO" ? d.exits - d.entries : d.entries - d.exits })) ?? [],
		[accountType, data],
	);

	const chartConfig = {
		entries: { label: "Entradas", color: "#16a34a" },
		exits: { label: "Saídas", color: "#dc2626" },
		net: { label: "Resultado", color: "#6366f1" },
	} satisfies ChartConfig;

	const header = (
		<div className="mb-1 flex items-center justify-between px-0.5">
			<span className="text-[0.55rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{GRAPH_TYPE_LABELS[graphType]}</span>
			<div className="flex items-center gap-0.5">
				{GRAPH_TYPE_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						type="button"
						title={opt.label}
						onClick={() => setGraphType(opt.value)}
						className={cn(
							"flex h-5 w-5 items-center justify-center rounded-md transition-colors",
							graphType === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						{opt.icon}
					</button>
				))}
			</div>
		</div>
	);

	if (isLoading) {
		return (
			<div className="flex w-full flex-col flex-1">
				{header}
				<div className="flex flex-1 items-center justify-center">
					<span className="text-[0.6rem] text-muted-foreground animate-pulse">Carregando...</span>
				</div>
			</div>
		);
	}

	const hasAnyData = data && data.some((d) => d.entries > 0 || d.exits > 0);
	if (!data || !hasAnyData) {
		return (
			<div className="flex w-full flex-col flex-1">
				{header}
				<div className="flex flex-1 items-center justify-center">
					<span className="text-[0.6rem] text-muted-foreground">Sem movimentações no período</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col flex-1">
			{header}
			<ChartContainer config={chartConfig} className="aspect-auto h-[88px] w-full">
				<AreaChart accessibilityLayer data={graphType === "consolidated" ? consolidatedData : data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
					<defs>
						<linearGradient id={`grad-entries-${accountId}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
							<stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
						</linearGradient>
						<linearGradient id={`grad-exits-${accountId}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#dc2626" stopOpacity={0.35} />
							<stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
						</linearGradient>
						<linearGradient id={`grad-net-${accountId}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
							<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid vertical={false} strokeWidth={0.2} />
					<XAxis dataKey="label" tickLine={false} tickMargin={4} axisLine={false} tick={{ fontSize: 8 }} tickFormatter={(v) => String(v).slice(0, 8)} />
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								formatter={(value, name) => {
									const colorMap: Record<string, string> = { entries: "#16a34a", exits: "#dc2626", net: "#6366f1" };
									const labelMap: Record<string, string> = { entries: "Entradas", exits: "Saídas", net: "Resultado líquido" };
									const color = colorMap[name as string] ?? "#888";
									const label = labelMap[name as string] ?? String(name);
									return (
										<>
											<div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
											<div className="flex flex-1 items-center justify-between gap-3 leading-none">
												<span className="text-muted-foreground">{label}</span>
												<span className="font-mono font-medium tabular-nums text-foreground">{formatToMoney(Number(value))}</span>
											</div>
										</>
									);
								}}
							/>
						}
					/>

					{(graphType === "entries-and-exits" || graphType === "entries") && (
						<Area
							type="monotone"
							dataKey="entries"
							stroke="#16a34a"
							strokeWidth={1.5}
							fill={`url(#grad-entries-${accountId})`}
							dot={false}
							activeDot={{ r: 3, strokeWidth: 0 }}
						/>
					)}
					{(graphType === "entries-and-exits" || graphType === "exits") && (
						<Area
							type="monotone"
							dataKey="exits"
							stroke="#dc2626"
							strokeWidth={1.5}
							fill={`url(#grad-exits-${accountId})`}
							dot={false}
							activeDot={{ r: 3, strokeWidth: 0 }}
						/>
					)}
					{graphType === "consolidated" && (
						<Area
							type="monotone"
							dataKey="net"
							stroke="#6366f1"
							strokeWidth={1.5}
							fill={`url(#grad-net-${accountId})`}
							dot={false}
							activeDot={{ r: 3, strokeWidth: 0 }}
						/>
					)}
				</AreaChart>
			</ChartContainer>
		</div>
	);
}
