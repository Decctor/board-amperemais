"use client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useSellersGraph } from "@/lib/queries/sellers";
import type { TGetSellersGraphInput } from "@/pages/api/sellers/stats/graph";
import { Activity, BadgeDollarSign, CirclePlus, Ticket, Users } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip } from "../ui/chart";

type CustomGraphTooltipProps = {
	active?: boolean;
	payload?: Array<{
		payload: { label: string; value: number };
		value: number;
		color?: string;
	}>;
	valueFormatter: (value: number) => string;
	metricLabel: string;
};

function CustomSellersTooltip({ active, payload, valueFormatter, metricLabel }: CustomGraphTooltipProps) {
	if (!active || !payload || !payload.length) return null;

	const data = payload[0].payload;

	return (
		<div className="bg-background border-border rounded-lg border p-3 shadow-lg">
			<p className="text-foreground mb-2 text-xs font-semibold">{data.label}</p>
			<div className="flex items-center gap-2">
				<div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
				<span className="text-muted-foreground text-xs">{metricLabel}:</span>
				<span className="text-foreground text-xs font-semibold">{valueFormatter(data.value)}</span>
			</div>
		</div>
	);
}

type SellersGraphsProps = {
	periodAfter: Date | null;
	periodBefore: Date | null;
};

export default function SellersGraphs({ periodAfter, periodBefore }: SellersGraphsProps) {
	const [graphType, setGraphType] = useState<TGetSellersGraphInput["graphType"]>("sales-value");

	const { data: graphData, isLoading: graphLoading } = useSellersGraph({
		graphType,
		periodAfter: periodAfter ?? undefined,
		periodBefore: periodBefore ?? undefined,
	});

	const chartConfig = {
		value: {
			label:
				graphType === "sales-value"
					? "Faturamento"
					: graphType === "sales-quantity"
						? "Quantidade de Vendas"
						: graphType === "active-sellers"
							? "Vendedores Ativos"
							: "Ticket Médio",
			color: "#fead41",
		},
	} satisfies ChartConfig;

	const metricLabels = {
		"sales-value": "Faturamento",
		"sales-quantity": "Quantidade",
		"active-sellers": "Vendedores Ativos",
		"average-ticket": "Ticket Médio",
	};

	const valueFormatter = (value: number) => {
		if (graphType === "sales-value" || graphType === "average-ticket") {
			return formatToMoney(value);
		}
		return formatDecimalPlaces(value);
	};

	const GRAPH_LABEL_MAP = {
		"sales-value": "GRÁFICO DE VALOR VENDIDO",
		"sales-quantity": "GRÁFICO DE QUANTIDADE DE VENDAS",
		"active-sellers": "GRÁFICO DE VENDEDORES ATIVOS",
		"average-ticket": "GRÁFICO DE TICKET MÉDIO",
	};
	return (
		<div className="w-full flex flex-col gap-2 py-2 h-full">
			<div className="bg-card border-primary/20 flex w-full h-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
					<h1 className="text-xs font-medium tracking-tight uppercase">{graphType ? GRAPH_LABEL_MAP[graphType] : "GRÁFICO DE VENDEDORES"}</h1>
					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={graphType === "sales-value" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setGraphType("sales-value")}
									>
										<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Faturamento Total</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={graphType === "sales-quantity" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setGraphType("sales-quantity")}
									>
										<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Quantidade de Vendas</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={graphType === "active-sellers" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setGraphType("active-sellers")}
									>
										<Users className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Vendedores Ativos por Período</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={graphType === "average-ticket" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setGraphType("average-ticket")}
									>
										<Ticket className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Evolução do Ticket Médio</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
				<div className="flex w-full flex-1 items-center gap-4 min-h-0">
					{graphLoading ? (
						<div className="flex w-full h-full items-center justify-center">
							<p className="text-sm text-muted-foreground">Carregando gráfico...</p>
						</div>
					) : graphData && graphData.length > 0 ? (
						<div className="flex w-full h-full items-center justify-center min-h-[350px]">
							<ChartContainer className="aspect-auto h-full w-full min-h-[350px]" config={chartConfig}>
								<AreaChart
									accessibilityLayer
									data={graphData}
									margin={{
										top: 15,
										right: 15,
										left: 15,
										bottom: 15,
									}}
								>
									<CartesianGrid vertical={false} />
									<XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 12)} />
									<YAxis tickFormatter={valueFormatter} />
									<ChartTooltip cursor={false} content={<CustomSellersTooltip valueFormatter={valueFormatter} metricLabel={metricLabels[graphType]} />} />
									<defs>
										<linearGradient id="fillSellersValue" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor={chartConfig.value.color} stopOpacity={0.8} />
											<stop offset="95%" stopColor={chartConfig.value.color} stopOpacity={0.1} />
										</linearGradient>
									</defs>
									<Area dataKey="value" type="monotone" fill="url(#fillSellersValue)" fillOpacity={0.4} stroke={chartConfig.value.color} strokeWidth={2} />
								</AreaChart>
							</ChartContainer>
						</div>
					) : (
						<div className="flex w-full h-full items-center justify-center">
							<p className="text-sm text-muted-foreground">Nenhum dado disponível para o período selecionado.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
