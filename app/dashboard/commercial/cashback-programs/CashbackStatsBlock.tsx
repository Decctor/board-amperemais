"use client";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useDebounceMemo } from "@/lib/hooks/use-debounce";
import { useCashbackProgramStats, useCashbackProgramsGraph } from "@/lib/queries/cashback-programs";
import { BadgeDollarSign, CirclePlus, Clock, Percent, ShoppingCart, UserPlus, UserRoundPlus, UserRoundX, Users, UsersRound, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { useDebounce } from "use-debounce";

type CashbackStatsBlockProps = {
	period: { after: string; before: string };
};

export default function CashbackStatsBlock({ period }: CashbackStatsBlockProps) {
	const [debouncedPeriod] = useDebounce(period, 1000);

	const { data: stats, isLoading } = useCashbackProgramStats(debouncedPeriod);

	return (
		<div className="w-full flex flex-col gap-2 py-2">
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Total de Participantes"
					icon={<UsersRound className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalParticipants.atual || 0, format: (n) => formatDecimalPlaces(n) }}
					previous={
						stats?.totalParticipants.anterior ? { value: stats.totalParticipants.anterior || 0, format: (n) => formatDecimalPlaces(n) } : undefined
					}
					className="w-full lg:w-1/4"
				/>
				<StatUnitCard
					title="Total de Novos Participantes"
					icon={<UserRoundPlus className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalNewParticipants.atual || 0, format: (n) => formatDecimalPlaces(n) }}
					previous={
						stats?.totalNewParticipants.anterior ? { value: stats.totalNewParticipants.anterior || 0, format: (n) => formatDecimalPlaces(n) } : undefined
					}
					className="w-full lg:w-1/4"
				/>
				<StatUnitCard
					title="Total de Clientes"
					icon={<Users className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalClients.atual || 0, format: (n) => formatDecimalPlaces(n) }}
					previous={stats?.totalClients.anterior ? { value: stats.totalClients.anterior || 0, format: (n) => formatDecimalPlaces(n) } : undefined}
					className="w-full lg:w-1/4"
				/>
				<StatUnitCard
					title="Total de Novos Clientes"
					icon={<UserPlus className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalNewClients.atual || 0, format: (n) => formatDecimalPlaces(n) }}
					previous={stats?.totalNewClients.anterior ? { value: stats.totalNewClients.anterior || 0, format: (n) => formatDecimalPlaces(n) } : undefined}
					className="w-full lg:w-1/4"
				/>
			</div>
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Faturamento por Clientes Existentes"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: stats?.revenueFromRecurrentClients.atual ? Number(stats.revenueFromRecurrentClients.atual) : 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						stats?.revenueFromRecurrentClients.anterior
							? {
									value: stats.revenueFromRecurrentClients.anterior || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
					footer={
						<div className="flex items-center gap-1">
							<p className="text-muted-foreground text-xs font-medium tracking-tight uppercase">REPRESENTATIVIDADE:</p>
							<p className="text-primary text-xs font-bold">{formatDecimalPlaces(stats?.revenueFromRecurrentClients.percentage || 0)}%</p>
						</div>
					}
					className="w-full lg:w-1/3"
				/>
				<StatUnitCard
					title="Faturamento por Clientes Novos"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: stats?.revenueFromNewClients.atual ? Number(stats.revenueFromNewClients.atual) : 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						stats?.revenueFromNewClients.anterior
							? {
									value: stats.revenueFromNewClients.anterior || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
					footer={
						<div className="flex items-center gap-1">
							<p className="text-muted-foreground text-xs font-medium tracking-tight uppercase">REPRESENTATIVIDADE:</p>
							<p className="text-primary text-xs font-bold">{formatDecimalPlaces(stats?.revenueFromNewClients.percentage || 0)}%</p>
						</div>
					}
					className="w-full lg:w-1/3"
				/>
				<StatUnitCard
					title="Faturamento Ao Consumidor"
					icon={<UserRoundX className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: stats?.revenueFromNonIdentifiedClients.atual ? Number(stats.revenueFromNonIdentifiedClients.atual) : 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						stats?.revenueFromNonIdentifiedClients.anterior
							? {
									value: stats.revenueFromNonIdentifiedClients.anterior || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
					footer={
						<div className="flex items-center gap-1">
							<p className="text-muted-foreground text-xs font-medium tracking-tight uppercase">REPRESENTATIVIDADE:</p>
							<p className="text-primary text-xs font-bold">{formatDecimalPlaces(stats?.revenueFromNonIdentifiedClients.percentage || 0)}%</p>
						</div>
					}
					className="w-full lg:w-1/3"
				/>
			</div>
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Nº TOTAL DE VENDAS"
					icon={<ShoppingCart className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalSalesCount.atual || 0, format: (n) => formatDecimalPlaces(n) }}
					previous={stats?.totalSalesCount.anterior ? { value: stats.totalSalesCount.anterior || 0, format: (n) => formatDecimalPlaces(n) } : undefined}
					className="w-full lg:w-1/2"
				/>
				<StatUnitCard
					title="VALOR TOTAL VENDIDO"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalSalesValue.atual || 0, format: (n) => formatToMoney(n) }}
					previous={stats?.totalSalesValue.anterior ? { value: stats.totalSalesValue.anterior || 0, format: (n) => formatToMoney(n) } : undefined}
					className="w-full lg:w-1/2"
				/>
			</div>
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Nº VENDAS COM CASHBACK"
					icon={<ShoppingCart className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.salesWithCashbackCount.atual || 0, format: (n) => formatDecimalPlaces(n) }}
					previous={
						stats?.salesWithCashbackCount.anterior
							? { value: stats.salesWithCashbackCount.anterior || 0, format: (n) => formatDecimalPlaces(n) }
							: undefined
					}
					footer={
						<div className="flex items-center gap-1">
							<p className="text-muted-foreground text-xs font-medium tracking-tight uppercase">REPRESENTATIVIDADE:</p>
							<p className="text-primary text-xs font-bold">{formatDecimalPlaces(stats?.salesWithCashbackCount.percentage || 0)}%</p>
						</div>
					}
					className="w-full lg:w-1/2"
				/>
				<StatUnitCard
					title="VALOR VENDIDO COM CASHBACK"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.salesWithCashbackValue.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.salesWithCashbackValue.anterior ? { value: stats.salesWithCashbackValue.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					footer={
						<div className="flex items-center gap-1">
							<p className="text-muted-foreground text-xs font-medium tracking-tight uppercase">REPRESENTATIVIDADE:</p>
							<p className="text-primary text-xs font-bold">{formatDecimalPlaces(stats?.salesWithCashbackValue.percentage || 0)}%</p>
						</div>
					}
					className="w-full lg:w-1/2"
				/>
			</div>
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Cashback Gerado"
					icon={<CirclePlus className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalCashbackGenerated.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.totalCashbackGenerated.anterior ? { value: stats.totalCashbackGenerated.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/5"
				/>
				<StatUnitCard
					title="Cashback Resgatado"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalCashbackRescued.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.totalCashbackRescued.anterior ? { value: stats.totalCashbackRescued.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/5"
				/>
				<StatUnitCard
					title="Taxa de Resgate"
					icon={<Percent className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.redemptionRate.atual || 0, format: (n) => `${formatDecimalPlaces(n)}%` }}
					previous={
						stats?.redemptionRate.anterior ? { value: stats.redemptionRate.anterior || 0, format: (n) => `${formatDecimalPlaces(n)}%` } : undefined
					}
					className="w-full lg:w-1/5"
				/>
				<StatUnitCard
					title="Cashback Expirado"
					icon={<XCircle className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalExpiredCashback.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.totalExpiredCashback.anterior ? { value: stats.totalExpiredCashback.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/5"
					lowerIsBetter={true}
				/>
				<StatUnitCard
					title="Cashback Expirando"
					icon={<Clock className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalExpiringCashback.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.totalExpiringCashback.anterior ? { value: stats.totalExpiringCashback.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/5"
					lowerIsBetter={true}
				/>
			</div>
			<CashbackProgramsGraphBlock period={debouncedPeriod} />
		</div>
	);
}

type EnrichedGraphData = {
	label: string;
	value: number;
	percentageFromStart?: number;
	percentageFromPrevious?: number;
};

type CustomTooltipProps = {
	active?: boolean;
	payload?: Array<{
		payload: EnrichedGraphData;
		value: number;
		color?: string;
	}>;
	valueFormatter: (value: number) => string;
	metricLabel: string;
};

function CustomCashbackTooltip({ active, payload, valueFormatter, metricLabel }: CustomTooltipProps) {
	if (!active || !payload || !payload.length) return null;

	const data = payload[0].payload;

	return (
		<div className="bg-background border-border rounded-lg border p-3 shadow-lg">
			<p className="text-foreground mb-2 text-xs font-semibold">{data.label}</p>
			<div className="space-y-1.5">
				<div className="flex items-center gap-2">
					<div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
					<span className="text-muted-foreground text-xs">{metricLabel}:</span>
					<span className="text-foreground text-xs font-semibold">{valueFormatter(data.value)}</span>
				</div>
				{data.percentageFromStart !== undefined && (
					<div className="border-border ml-4 border-l pl-3">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground text-xs">Em relação ao início:</span>
							<span
								className={`text-xs font-medium ${
									data.percentageFromStart > 0 ? "text-green-600" : data.percentageFromStart < 0 ? "text-red-600" : "text-muted-foreground"
								}`}
							>
								{data.percentageFromStart > 0 ? "+" : ""}
								{formatDecimalPlaces(data.percentageFromStart)}%
							</span>
						</div>
					</div>
				)}
				{data.percentageFromPrevious !== undefined && (
					<div className="border-border ml-4 border-l pl-3">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground text-xs">Em relação ao anterior:</span>
							<span
								className={`text-xs font-medium ${
									data.percentageFromPrevious > 0 ? "text-green-600" : data.percentageFromPrevious < 0 ? "text-red-600" : "text-muted-foreground"
								}`}
							>
								{data.percentageFromPrevious > 0 ? "+" : ""}
								{formatDecimalPlaces(data.percentageFromPrevious)}%
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

type CashbackProgramsGraphBlockProps = {
	period: { after: string; before: string };
};
function CashbackProgramsGraphBlock({ period }: CashbackProgramsGraphBlockProps) {
	const [graphType, setGraphType] = useState<"participants-growth" | "total-cashback-generated" | "total-cashback-rescued">(
		"total-cashback-generated",
	);
	const debouncedPeriod = useDebounceMemo(period, 1000);
	const { data: graphsStats, queryKey } = useCashbackProgramsGraph({
		graphType,
		periodAfter: debouncedPeriod.after ? new Date(debouncedPeriod.after) : undefined,
		periodBefore: debouncedPeriod.before ? new Date(debouncedPeriod.before) : undefined,
	});

	const METRIC_LABELS = {
		"participants-growth": {
			title: "Total de Participantes",
			chartLabel: "PARTICIPANTES",
			valorFormatting: (value: number) => value.toString(),
			icon: <UsersRound className="h-4 min-h-4 w-4 min-w-4" />,
		},
		"total-cashback-generated": {
			title: "Cashback Gerado",
			chartLabel: "CASHBACK GERADO",
			valorFormatting: (value: number) => formatToMoney(value),
			icon: <CirclePlus className="h-4 min-h-4 w-4 min-w-4" />,
		},
		"total-cashback-rescued": {
			title: "Cashback Resgatado",
			chartLabel: "CASHBACK RESGATADO",
			valorFormatting: (value: number) => formatToMoney(value),
			icon: <BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />,
		},
	};
	const firstPeriodChartConfig = {
		label: {
			label: METRIC_LABELS[graphType].chartLabel,
			color: "#000000",
		},
		value: {
			label: METRIC_LABELS[graphType].chartLabel,
			color: "#FFB900",
		},
	};

	// Enriquecer os dados do gráfico com porcentagens calculadas
	const enrichedGraphData = useMemo<EnrichedGraphData[]>(() => {
		if (!graphsStats || graphsStats.length === 0) return [];

		const firstValue = graphsStats[0].value;

		return graphsStats.map((item, index) => {
			// Calcular porcentagem em relação ao início
			const percentageFromStart = firstValue !== 0 ? ((item.value - firstValue) / Math.abs(firstValue)) * 100 : 0;

			// Calcular porcentagem em relação ao anterior
			let percentageFromPrevious: number | undefined = undefined;
			if (index > 0) {
				const previousValue = graphsStats[index - 1].value;
				percentageFromPrevious = previousValue !== 0 ? ((item.value - previousValue) / Math.abs(previousValue)) * 100 : 0;
			}

			return {
				label: item.label,
				value: item.value,
				percentageFromStart,
				percentageFromPrevious,
			};
		});
	}, [graphsStats]);

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-xs">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">{METRIC_LABELS[graphType].title}</h1>
				<div className="flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={graphType === "participants-growth" ? "default" : "ghost"}
								size="fit"
								className="rounded-lg p-2"
								onClick={() => setGraphType("participants-growth")}
							>
								{METRIC_LABELS["participants-growth"].icon}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Total de Participantes</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={graphType === "total-cashback-generated" ? "default" : "ghost"}
								size="fit"
								className="rounded-lg p-2"
								onClick={() => setGraphType("total-cashback-generated")}
							>
								{METRIC_LABELS["total-cashback-generated"].icon}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Cashback Gerado</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={graphType === "total-cashback-rescued" ? "default" : "ghost"}
								size="fit"
								className="rounded-lg p-2"
								onClick={() => setGraphType("total-cashback-rescued")}
							>
								{METRIC_LABELS["total-cashback-rescued"].icon}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Cashback Resgatado</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>
			<div className="flex w-full items-center gap-4">
				<div className="flex max-h-[400px] min-h-[400px] w-full items-center justify-center lg:max-h-[350px] lg:min-h-[350px]">
					<ChartContainer config={firstPeriodChartConfig} className="aspect-auto h-[350px] w-full lg:h-[250px]">
						<ComposedChart
							data={enrichedGraphData}
							margin={{
								top: 0,
								right: 15,
								left: 15,
								bottom: 0,
							}}
						>
							<defs>
								<linearGradient id="firstGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="10%" stopColor={firstPeriodChartConfig.value.color} stopOpacity={0.9} />
									<stop offset="90%" stopColor={firstPeriodChartConfig.value.color} stopOpacity={0.1} />
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								minTickGap={32}
								// tickFormatter={(value) => formatDateAsLocale(value) || ''}
								interval="preserveStartEnd" // Mostra primeiro e último valor
								angle={-15} // Rotaciona os labels para melhor legibilidade
								textAnchor="end" // Alinhamento do texto
							/>
							<YAxis
								orientation="left"
								tickFormatter={(value) => METRIC_LABELS[graphType].valorFormatting(value)}
								stroke={firstPeriodChartConfig.value.color}
							/>

							<ChartTooltip
								cursor={false}
								content={
									<CustomCashbackTooltip valueFormatter={METRIC_LABELS[graphType].valorFormatting} metricLabel={METRIC_LABELS[graphType].chartLabel} />
								}
							/>
							<Area dataKey="value" type="monotone" fill="url(#firstGradient)" stroke={firstPeriodChartConfig.value.color} />
							<ChartLegend content={<ChartLegendContent payload={enrichedGraphData} />} />
						</ComposedChart>
					</ChartContainer>
				</div>
			</div>
		</div>
	);
}
