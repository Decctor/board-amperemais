"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useGoalsStats } from "@/lib/queries/goals";
import { useSalesPulse } from "@/lib/queries/stats/sales-pulse";
import { cn } from "@/lib/utils";
import { ArrowUpRight, BadgeDollarSign, Goal, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { resolveTodayRange, useDayKey } from "./use-day-key";

/**
 * Faixa de destaque do dashboard: o número que lidera a página (vendas de hoje) com tendência, e o
 * ritmo da meta ativa. Um gráfico por assunto, sem filtros — a análise completa vive em
 * Vendas > Resultados e em Metas.
 */

type HeroStripProps = {
	showSales: boolean;
	showGoal: boolean;
};

export function HeroStrip({ showSales, showGoal }: HeroStripProps) {
	if (!showSales && !showGoal) return null;
	return (
		<div className="grid w-full grid-cols-1 gap-3 xl:grid-cols-12">
			{showSales ? (
				<div className={cn("min-w-0", showGoal ? "xl:col-span-7" : "xl:col-span-12")}>
					<SalesPulseCard />
				</div>
			) : null}
			{showGoal ? (
				<div className={cn("min-w-0", showSales ? "xl:col-span-5" : "xl:col-span-12")}>
					<GoalPacingCard />
				</div>
			) : null}
		</div>
	);
}

const cardClassName = "bg-card border-border flex h-full w-full flex-col gap-3 rounded-xl border px-4 py-4 shadow-2xs";

function HeroHeader({ icon, title, hint, href }: { icon: React.ReactNode; title: string; hint?: string; href: string }) {
	return (
		<div className="flex w-full items-center justify-between gap-2">
			<div className="flex shrink-0 items-center gap-2 text-muted-foreground [&>svg]:size-4">
				{icon}
				<h2 className="text-label text-foreground">{title}</h2>
			</div>
			<div className="text-micro flex min-w-0 items-center justify-end gap-2 text-muted-foreground">
				{hint ? <span className="truncate">{hint}</span> : null}
				<Link
					href={href}
					className="flex items-center gap-0.5 rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Ver detalhes
					<ArrowUpRight className="size-3.5" aria-hidden />
				</Link>
			</div>
		</div>
	);
}

function HeroLoading() {
	return (
		<div className="flex flex-col gap-3" aria-busy>
			<Skeleton className="h-10 w-40 rounded-md" />
			<Skeleton className="h-3 w-48 rounded" />
			<Skeleton className="h-24 w-full rounded-md" />
		</div>
	);
}

function HeroError({ error }: { error: unknown }) {
	return <p className="text-xs text-destructive">{getErrorMessage(error)}</p>;
}

// ---------------------------------------------------------------------------------------------
// Vendas de hoje + tendência de 7 dias
// ---------------------------------------------------------------------------------------------

function DeltaBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
	if (previous <= 0) return <span className="text-xs text-muted-foreground">sem vendas {label}</span>;
	const delta = ((current - previous) / previous) * 100;
	const up = delta >= 0;
	const Icon = up ? TrendingUp : TrendingDown;
	return (
		<span className={cn("flex items-center gap-1 text-xs font-semibold", up ? "text-success" : "text-destructive")}>
			<Icon className="size-3.5" aria-hidden />
			{up ? "+" : ""}
			{formatDecimalPlaces(delta, 0, 0)}%<span className="font-normal text-muted-foreground"> {label}</span>
		</span>
	);
}

function SalesPulseCard() {
	const { colors } = useOrgColors();
	const dayKey = useDayKey();
	const dayStart = useMemo(() => resolveTodayRange(dayKey).after.toDate(), [dayKey]);
	const { data, isPending, isError, error, isFetching } = useSalesPulse({ dayStart, days: 7 });

	const chartConfig = { faturamento: { label: "Faturamento", color: colors.primary } } satisfies ChartConfig;

	return (
		<section className={cardClassName}>
			<HeroHeader icon={<BadgeDollarSign />} title="Vendas de hoje" hint="7 dias" href={appRoutes.sales.results()} />
			{isPending ? (
				<HeroLoading />
			) : isError ? (
				<HeroError error={error} />
			) : (
				<div className={cn("flex flex-col gap-3 transition-opacity", isFetching && "opacity-70")}>
					{/* Um número, sua variação e a linha do tempo. Sem a grade de indicadores de apoio: a
					    leitura completa do dia vive em Vendas > Resultados. */}
					<div className="flex flex-col gap-1">
						<span className="text-3xl font-extrabold leading-none tracking-[-0.015em] md:text-4xl">{formatToMoney(data.hoje.faturamento)}</span>
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
							<DeltaBadge current={data.hoje.faturamento} previous={data.mesmoDiaSemanaAnterior.faturamento} label="que na semana passada" />
							<span aria-hidden>·</span>
							<span>
								{formatDecimalPlaces(data.hoje.qtdeVendas)} {data.hoje.qtdeVendas === 1 ? "venda" : "vendas"}, ticket médio de{" "}
								{formatToMoney(data.hoje.ticketMedio)}
							</span>
						</div>
					</div>
					<ChartContainer config={chartConfig} className="h-24 w-full">
						<AreaChart data={data.serie} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
							<defs>
								<linearGradient id="hubSalesPulse" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={colors.primary} stopOpacity={0.18} />
									<stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
								</linearGradient>
							</defs>
							<XAxis dataKey="rotulo" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
							<ChartTooltip
								cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
								content={<ChartTooltipContent indicator="line" formatter={(value) => formatToMoney(Number(value))} />}
							/>
							<Area
								dataKey="faturamento"
								type="monotone"
								stroke={colors.primary}
								strokeWidth={2}
								fill="url(#hubSalesPulse)"
								dot={false}
								activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
								isAnimationActive={false}
							/>
						</AreaChart>
					</ChartContainer>
				</div>
			)}
		</section>
	);
}

// ---------------------------------------------------------------------------------------------
// Meta ativa: ritmo acumulado
// ---------------------------------------------------------------------------------------------

const PACING = {
	ADIANTADO: { label: "Adiantada", className: "text-success" },
	NO_RITMO: { label: "No ritmo", className: "text-foreground" },
	ATRASADO: { label: "Atrasada", className: "text-destructive" },
} as const;

function GoalPacingCard() {
	const { colors } = useOrgColors();
	const { data, isPending, isError, error, isFetching } = useGoalsStats();
	const goal = data?.activeGoal ?? null;

	const chartConfig = {
		realizadoAcumulado: { label: "Realizado", color: colors.primary },
		objetivoAcumulado: { label: "Esperado", color: "var(--color-muted-foreground)" },
	} satisfies ChartConfig;

	return (
		<section className={cardClassName}>
			<HeroHeader
				icon={<Goal />}
				title="Meta do período"
				hint={goal ? `Dia ${goal.ritmo.diaAtualDoPeriodo} de ${goal.ritmo.totalDias}` : undefined}
				href={appRoutes.management.goals()}
			/>
			{isPending ? (
				<HeroLoading />
			) : isError ? (
				<HeroError error={error} />
			) : !goal ? (
				<p className="text-sm text-muted-foreground">Nenhuma meta ativa no momento.</p>
			) : (
				<div className={cn("flex flex-col gap-3 transition-opacity", isFetching && "opacity-70")}>
					<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
						<div className="flex flex-col gap-1">
							<span className={cn("text-3xl font-black leading-none tracking-tight", goal.percentualValor >= 100 && "text-warning-surface-foreground")}>
								{formatDecimalPlaces(goal.percentualValor, 0, 0)}%
							</span>
							<span className="text-xs text-muted-foreground">
								{formatToMoney(goal.realizadoValor)} de {formatToMoney(goal.objetivoValor)}
							</span>
						</div>
						<dl className="flex items-center gap-5 text-xs">
							<div className="flex flex-col">
								<dt className="text-muted-foreground">Ritmo até ontem</dt>
								<dd className={cn("text-sm font-semibold", PACING[goal.ritmo.situacao].className)}>
									{PACING[goal.ritmo.situacao].label}
									<span className="font-normal text-muted-foreground tabular-nums">
										{" "}
										({goal.ritmo.diferenca >= 0 ? "+" : ""}
										{formatToMoney(goal.ritmo.diferenca)})
									</span>
								</dd>
							</div>
							{goal.ritmo.ritmoNecessarioDiario !== null ? (
								<div className="flex flex-col">
									<dt className="text-muted-foreground">Falta por dia</dt>
									<dd className="text-sm font-semibold tabular-nums">{formatToMoney(goal.ritmo.ritmoNecessarioDiario)}</dd>
								</div>
							) : null}
						</dl>
					</div>
					<ChartContainer config={chartConfig} className="h-24 w-full">
						<ComposedChart data={goal.ritmo.curva} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
							<defs>
								<linearGradient id="hubGoalPace" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={colors.primary} stopOpacity={0.18} />
									<stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
							<XAxis dataKey="rotulo" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
							<YAxis hide domain={[0, "dataMax"]} />
							<ChartTooltip
								cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
								content={
									<ChartTooltipContent
										indicator="line"
										formatter={(value, name) =>
											`${chartConfig[name as keyof typeof chartConfig]?.label ?? name}: ${value === null ? "—" : formatToMoney(Number(value))}`
										}
									/>
								}
							/>
							<Line
								dataKey="objetivoAcumulado"
								type="monotone"
								stroke="var(--color-muted-foreground)"
								strokeWidth={1.5}
								dot={false}
								isAnimationActive={false}
							/>
							<Area
								dataKey="realizadoAcumulado"
								type="monotone"
								stroke={colors.primary}
								strokeWidth={2}
								fill="url(#hubGoalPace)"
								connectNulls={false}
								dot={false}
								activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
								isAnimationActive={false}
							/>
						</ComposedChart>
					</ChartContainer>
					{/* Duas séries: a legenda é obrigatória; a cor identifica a marca, nunca o texto. */}
					<div className="text-micro flex items-center gap-4 text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: colors.primary }} />
							Realizado
						</span>
						<span className="flex items-center gap-1.5">
							<span className="h-0.5 w-4 rounded-full bg-muted-foreground" />
							Esperado
						</span>
					</div>
				</div>
			)}
		</section>
	);
}
