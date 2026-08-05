"use client";

import dayjs from "dayjs";
import { Banknote, CalendarClock, Flame, Hourglass, MoveDown, MoveUp, Repeat, TriangleAlert, Wallet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useFinancesCashFlow } from "@/lib/queries/finance-analytics";
import { cn } from "@/lib/utils";
import { StatCard } from "@/app/dashboard/finance/_components/stat-card";

const HORIZON_OPTIONS = [30, 60, 90] as const;

const balanceChartConfig = {
	saldoProjetado: {
		label: "SALDO PROJETADO",
		color: "#2563eb",
	},
} satisfies ChartConfig;

const flowsChartConfig = {
	entradas: {
		label: "ENTRADAS PREVISTAS",
		color: "#16a34a",
	},
	saidas: {
		label: "SAÍDAS PREVISTAS",
		color: "#dc2626",
	},
} satisfies ChartConfig;

export default function CashFlowPage() {
	const { data, isError, error, horizonDays, setHorizonDays } = useFinancesCashFlow({ initialHorizonDays: 90 });

	const overview = data?.visaoGeral;
	const projection = data?.projecao;

	const runwayLabel = (() => {
		if (!overview) return "...";
		if (overview.queimaMensal === 0) return "∞";
		if (overview.mesesDeCaixa === null) return "—";
		if (overview.mesesDeCaixa > 36) return "36+ meses";
		return `${formatDecimalPlaces(overview.mesesDeCaixa, 1, 1)} meses`;
	})();

	const projectionDaily = projection?.diaria || [];

	return (
		<div className="flex h-full w-full flex-col gap-4">
			<div className="flex min-h-8 flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<h1 className="text-xs font-bold tracking-tight uppercase">FLUXO DE CAIXA</h1>
				<div className="flex items-center gap-1 rounded-lg bg-muted/70 p-1">
					{HORIZON_OPTIONS.map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => setHorizonDays(option)}
							className={cn("rounded-md px-3 py-1 text-xs font-medium duration-300 ease-in-out", {
								"bg-background shadow-sm": horizonDays === option,
								"text-muted-foreground hover:text-foreground": horizonDays !== option,
							})}
						>
							{option} dias
						</button>
					))}
				</div>
			</div>

			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

			{projection?.primeiraDataNegativa ? (
				<div className="flex w-full items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-red-700 dark:text-red-400">
					<TriangleAlert className="w-4 h-4 min-w-4 min-h-4" />
					<p className="text-xs font-medium">
						A projeção indica caixa negativo a partir de {dayjs(projection.primeiraDataNegativa).format("DD/MM/YYYY")}. Considere antecipar recebimentos ou
						renegociar saídas previstas até essa data.
					</p>
				</div>
			) : null}

			<div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					icon={<Wallet className="w-4 h-4 min-w-4 min-h-4" />}
					iconWrapperClassName="bg-blue-200 text-blue-600"
					label="CAIXA CONSOLIDADO"
					value={
						<div className="flex items-center gap-2">
							<h1 className="text-sm font-medium">{formatToMoney(overview?.totalCaixa || 0)}</h1>
							{overview && overview.totalPassivos > 0 ? (
								<span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-red-700 tabular-nums dark:text-red-400">
									PASSIVOS {formatToMoney(overview.totalPassivos)}
								</span>
							) : null}
						</div>
					}
				/>
				<StatCard
					icon={<Flame className="w-4 h-4 min-w-4 min-h-4" />}
					iconWrapperClassName="bg-orange-200 text-orange-600"
					label="BURN MÉDIO (3M)"
					value={overview ? (overview.queimaMensal > 0 ? formatToMoney(overview.queimaMensal) : "FLUXO POSITIVO") : "..."}
				/>
				<StatCard
					icon={<Hourglass className="w-4 h-4 min-w-4 min-h-4" />}
					iconWrapperClassName="bg-purple-200 text-purple-600"
					label="RUNWAY"
					value={runwayLabel}
				/>
				<StatCard
					icon={<Repeat className="w-4 h-4 min-w-4 min-h-4" />}
					iconWrapperClassName="bg-teal-200 text-teal-600"
					label="RECORRENTES / MÊS"
					value={
						<div className="flex items-center gap-2">
							<div className="flex items-center gap-1 rounded-lg bg-green-200 px-2 py-1 text-green-600">
								<MoveDown className="w-4 h-4 min-w-4 min-h-4" />
								<h2 className="text-[0.65rem] font-medium">{formatToMoney(overview?.recorrentesEntradaMensal || 0)}</h2>
							</div>
							<div className="flex items-center gap-1 rounded-lg bg-red-200 px-2 py-1 text-red-600">
								<MoveUp className="w-4 h-4 min-w-4 min-h-4" />
								<h2 className="text-[0.65rem] font-medium">{formatToMoney(overview?.recorrentesSaidaMensal || 0)}</h2>
							</div>
						</div>
					}
				/>
			</div>

			<div className="flex w-full flex-col gap-4 lg:flex-row">
				<div className="flex w-full flex-col gap-2 lg:w-[70%]">
					<div className="bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
						<div className="flex w-full items-center justify-between gap-2">
							<div className="flex items-center justify-start gap-2">
								<CalendarClock className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="text-xs font-medium leading-none tracking-tight">SALDO PROJETADO</h1>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-[0.65rem] font-medium text-muted-foreground">AO FINAL DO HORIZONTE</span>
								<h1
									className={cn("text-sm font-medium tabular-nums", {
										"text-red-600 dark:text-red-400": (projection?.saldoFinal || 0) < 0,
									})}
								>
									{formatToMoney(projection?.saldoFinal || 0)}
								</h1>
							</div>
						</div>
						<div className="h-[220px] w-full">
							<ChartContainer config={balanceChartConfig} className="aspect-auto h-full w-full">
								<AreaChart accessibilityLayer data={projectionDaily} syncId="cash-projection">
									<defs>
										<linearGradient id="projectedBalanceFill" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
										</linearGradient>
									</defs>
									<CartesianGrid vertical={false} strokeWidth={0.2} />
									<YAxis tickLine={false} tickMargin={10} axisLine={false} width={80} tickFormatter={(value: number) => formatToMoney(value)} />
									<XAxis
										dataKey="data"
										tickLine={false}
										tickMargin={10}
										axisLine={false}
										minTickGap={32}
										tickFormatter={(value: string) => dayjs(value).format("DD/MM")}
									/>
									<ChartTooltip
										cursor={false}
										content={<ChartTooltipContent indicator="line" labelFormatter={(value) => dayjs(value as string).format("DD/MM/YYYY")} />}
									/>
									<ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} />
									<Area dataKey="saldoProjetado" type="monotone" stroke="var(--color-saldoProjetado)" strokeWidth={2} fill="url(#projectedBalanceFill)" />
								</AreaChart>
							</ChartContainer>
						</div>
					</div>
					<div className="bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
						<div className="flex w-full items-center justify-between gap-2">
							<div className="flex items-center justify-start gap-2">
								<Banknote className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="text-xs font-medium leading-none tracking-tight">ENTRADAS E SAÍDAS PREVISTAS</h1>
							</div>
						</div>
						<div className="h-[180px] w-full">
							<ChartContainer config={flowsChartConfig} className="aspect-auto h-full w-full">
								<BarChart accessibilityLayer data={projectionDaily} syncId="cash-projection">
									<CartesianGrid vertical={false} strokeWidth={0.2} />
									<YAxis tickLine={false} tickMargin={10} axisLine={false} width={80} tickFormatter={(value: number) => formatToMoney(value)} />
									<XAxis
										dataKey="data"
										tickLine={false}
										tickMargin={10}
										axisLine={false}
										minTickGap={32}
										tickFormatter={(value: string) => dayjs(value).format("DD/MM")}
									/>
									<ChartTooltip
										cursor={false}
										content={<ChartTooltipContent indicator="dashed" labelFormatter={(value) => dayjs(value as string).format("DD/MM/YYYY")} />}
									/>
									<Bar dataKey="entradas" fill="var(--color-entradas)" radius={4} />
									<Bar dataKey="saidas" fill="var(--color-saidas)" radius={4} />
									<ChartLegend content={<ChartLegendContent />} className="-translate-y-2 flex-wrap gap-2 *:basis-1/3 *:justify-center" />
								</BarChart>
							</ChartContainer>
						</div>
					</div>
				</div>
				<div className="flex w-full flex-col gap-2 lg:w-[30%]">
					<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
						<div className="flex items-center justify-start gap-2">
							<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 p-1 text-foreground">
								<Wallet className="w-4 h-4 min-w-4 min-h-4" />
							</div>
							<h1 className="text-xs font-medium leading-none tracking-tight">SALDO POR CONTA</h1>
						</div>
						<div className="flex w-full flex-col gap-2">
							{overview?.contas.map((account) => (
								<div key={account.id} className="flex w-full items-center justify-between gap-2">
									<h1 className="text-xs font-medium leading-none tracking-tight">{account.nome}</h1>
									<h1
										className={cn("text-sm font-medium tabular-nums", {
											"text-red-600 dark:text-red-400": account.saldoAtual < 0,
										})}
									>
										{formatToMoney(account.saldoAtual)}
									</h1>
								</div>
							))}
							{overview && overview.contas.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma conta financeira ativa cadastrada.</p> : null}
						</div>
					</div>
					<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
						<div className="flex items-center justify-start gap-2">
							<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 p-1 text-foreground">
								<CalendarClock className="w-4 h-4 min-w-4 min-h-4" />
							</div>
							<h1 className="text-xs font-medium leading-none tracking-tight">RESUMO DA PROJEÇÃO</h1>
						</div>
						<div className="flex w-full flex-col gap-2">
							{[
								{ id: "starting", label: "SALDO INICIAL", value: projection?.saldoInicial || 0 },
								{ id: "inflow", label: "ENTRADAS PREVISTAS", value: projection?.totalEntradasPrevistas || 0 },
								{ id: "outflow", label: "SAÍDAS PREVISTAS", value: -(projection?.totalSaidasPrevistas || 0) },
								{ id: "ending", label: "SALDO FINAL PROJETADO", value: projection?.saldoFinal || 0 },
							].map((row) => (
								<div key={row.id} className="flex w-full items-center justify-between gap-2">
									<h1 className="text-xs font-medium leading-none tracking-tight">{row.label}</h1>
									<h1
										className={cn("text-sm font-medium tabular-nums", {
											"text-red-600 dark:text-red-400": row.value < 0,
										})}
									>
										{formatToMoney(row.value)}
									</h1>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
