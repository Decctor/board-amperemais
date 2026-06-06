"use client";
import type { TGetCampaignGraphOutput } from "@/app/api/campaigns/stats/graph/route";
import { formatDecimalPlaces } from "@/lib/formatting";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";

type MergedPoint = {
	label: string;
	interactions: number;
	conversions: number;
};

type CampaignGraphBlockProps = {
	interactionsData: TGetCampaignGraphOutput["data"] | undefined;
	conversionsData: TGetCampaignGraphOutput["data"] | undefined;
	isLoading: boolean;
};

const chartConfig = {
	interactions: {
		label: "Interações",
		color: "#24549C",
	},
	conversions: {
		label: "Conversões",
		color: "#FFB900",
	},
} satisfies ChartConfig;

type TooltipProps = {
	active?: boolean;
	payload?: Array<{ name: string; value: number; color: string }>;
	label?: string;
};

function GraphTooltip({ active, payload, label }: TooltipProps) {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-background border border-border rounded-xl p-3 shadow-lg text-xs flex flex-col gap-1.5">
			<p className="font-bold text-foreground">{label}</p>
			{payload.map((p) => (
				<div key={p.name} className="flex items-center gap-2">
					<div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
					<span className="text-muted-foreground">{chartConfig[p.name as keyof typeof chartConfig]?.label ?? p.name}:</span>
					<span className="font-bold text-foreground">{formatDecimalPlaces(p.value)}</span>
				</div>
			))}
		</div>
	);
}

export function CampaignGraphBlock({ interactionsData, conversionsData, isLoading }: CampaignGraphBlockProps) {
	const merged: MergedPoint[] = useMemo(() => {
		if (!interactionsData || !conversionsData) return [];
		return interactionsData.map((item, i) => ({
			label: item.label,
			interactions: item.value,
			conversions: conversionsData[i]?.value ?? 0,
		}));
	}, [interactionsData, conversionsData]);

	return (
		<div className="bg-card border-border flex w-full min-w-0 flex-col gap-4 overflow-hidden rounded-xl border px-4 py-4 shadow-2xs">
			<div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
				<h2 className="text-xs font-bold uppercase tracking-wide text-foreground">Interações e conversões por dia</h2>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1.5">
						<div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartConfig.interactions.color }} />
						<span className="text-[0.65rem] text-muted-foreground font-medium">Interações</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartConfig.conversions.color }} />
						<span className="text-[0.65rem] text-muted-foreground font-medium">Conversões</span>
					</div>
				</div>
			</div>

			{isLoading ? (
				<div className="h-[220px] animate-pulse rounded-xl bg-muted/30 sm:h-[260px]" />
			) : merged.length > 0 ? (
				<ChartContainer className="aspect-auto h-[220px] w-full min-w-0 sm:h-[260px]" config={chartConfig}>
					<AreaChart
						accessibilityLayer
						data={merged}
						margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
					>
						<defs>
							<linearGradient id="fillInteractions" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={chartConfig.interactions.color} stopOpacity={0.3} />
								<stop offset="95%" stopColor={chartConfig.interactions.color} stopOpacity={0.03} />
							</linearGradient>
							<linearGradient id="fillConversions" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={chartConfig.conversions.color} stopOpacity={0.4} />
								<stop offset="95%" stopColor={chartConfig.conversions.color} stopOpacity={0.03} />
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={24}
							tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
							tickFormatter={(v) => v.slice(0, 10)}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
							width={36}
						/>
						<ChartTooltip cursor={false} content={<GraphTooltip />} />
						{/* Interactions behind */}
						<Area
							dataKey="interactions"
							type="monotone"
							fill="url(#fillInteractions)"
							stroke={chartConfig.interactions.color}
							strokeWidth={2}
						/>
						{/* Conversions in front */}
						<Area
							dataKey="conversions"
							type="monotone"
							fill="url(#fillConversions)"
							stroke={chartConfig.conversions.color}
							strokeWidth={2}
						/>
					</AreaChart>
				</ChartContainer>
			) : (
				<p className="text-sm text-muted-foreground py-10 text-center">Nenhum dado disponível para o período.</p>
			)}
		</div>
	);
}
