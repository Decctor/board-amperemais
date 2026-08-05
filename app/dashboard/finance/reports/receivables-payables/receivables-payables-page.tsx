"use client";

import { CalendarX2, HandCoins, Landmark, MoveDown, MoveUp, Percent, ReceiptText, Scale, ShieldCheck, Timer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useFinancesReceivablesPayables } from "@/lib/queries/finance-analytics";
import { cn } from "@/lib/utils";
import { StatCard } from "@/app/dashboard/finance/_components/stat-card";

const agingChartConfig = {
	receber: {
		label: "A RECEBER",
		color: "#16a34a",
	},
	pagar: {
		label: "A PAGAR",
		color: "#dc2626",
	},
} satisfies ChartConfig;

function formatDelayDays(days: number | null) {
	if (days === null) return "—";
	const rounded = formatDecimalPlaces(Math.abs(days), 1, 1);
	if (days > 0) return `+${rounded} dias`;
	if (days < 0) return `−${rounded} dias`;
	return "Em dia";
}

export default function ReceivablesPayablesPage() {
	const { data, isError, error, params, updateParams } = useFinancesReceivablesPayables({ initialParams: {} });

	const coberturaLabel = (() => {
		if (!data) return "...";
		if (data.liquidez.coberturaMeses === null) return "—";
		if (data.liquidez.coberturaMeses > 36) return "36+ meses";
		return `${formatDecimalPlaces(data.liquidez.coberturaMeses, 1, 1)} meses`;
	})();

	return (
		<div className="flex h-full w-full flex-col gap-4">
			<div className="flex min-h-8 items-center justify-between">
				<h1 className="text-xs font-bold tracking-tight uppercase">RECEBÍVEIS & PAGÁVEIS</h1>
				<DateIntervalInput
					label="PERÍODO"
					labelClassName="hidden"
					className="hover:bg-accent hover:text-accent-foreground border-none shadow-none"
					value={{ after: params.periodAfter, before: params.periodBefore }}
					handleChange={(value) => updateParams({ periodAfter: value.after ?? params.periodAfter, periodBefore: value.before ?? params.periodBefore })}
				/>
			</div>

			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

			<div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					icon={<MoveDown className="w-4 h-4 min-w-4 min-h-4" />}
					iconWrapperClassName="bg-green-200 text-green-600"
					label="TOTAL A RECEBER"
					value={
						<div className="flex items-center gap-2">
							<h1 className="text-sm font-medium">{formatToMoney(data?.totalAReceber || 0)}</h1>
							{data && data.vencidoAReceber > 0 ? (
								<span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-red-700 tabular-nums dark:text-red-400">
									VENCIDO {formatToMoney(data.vencidoAReceber)}
								</span>
							) : null}
						</div>
					}
				/>
				<StatCard
					icon={<MoveUp className="w-4 h-4 min-w-4 min-h-4" />}
					iconWrapperClassName="bg-red-200 text-red-600"
					label="TOTAL A PAGAR"
					value={
						<div className="flex items-center gap-2">
							<h1 className="text-sm font-medium">{formatToMoney(data?.totalAPagar || 0)}</h1>
							{data && data.vencidoAPagar > 0 ? (
								<span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-red-700 tabular-nums dark:text-red-400">
									VENCIDO {formatToMoney(data.vencidoAPagar)}
								</span>
							) : null}
						</div>
					}
				/>
				<StatCard
					icon={<Scale className="w-4 h-4 min-w-4 min-h-4" />}
					iconWrapperClassName="bg-blue-200 text-blue-600"
					label="CAPITAL DE GIRO"
					value={
						<h1
							className={cn("text-sm font-medium tabular-nums", {
								"text-red-600 dark:text-red-400": (data?.liquidez.capitalGiro || 0) < 0,
							})}
						>
							{formatToMoney(data?.liquidez.capitalGiro || 0)}
						</h1>
					}
				/>
				<StatCard
					icon={<ShieldCheck className="w-4 h-4 min-w-4 min-h-4" />}
					iconWrapperClassName="bg-purple-200 text-purple-600"
					label="COBERTURA DE FIXOS"
					value={coberturaLabel}
				/>
			</div>

			<div className="flex w-full flex-col gap-4 lg:flex-row">
				<div className="bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs lg:w-[55%]">
					<div className="flex w-full items-center justify-between gap-2">
						<div className="flex items-center justify-start gap-2">
							<CalendarX2 className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="text-xs font-medium leading-none tracking-tight">AGING POR VENCIMENTO</h1>
						</div>
					</div>
					<div className="h-[280px] w-full">
						<ChartContainer config={agingChartConfig} className="aspect-auto h-full w-full">
							<BarChart accessibilityLayer data={data?.vencimentos || []} layout="vertical">
								<CartesianGrid horizontal={false} strokeWidth={0.2} />
								<XAxis type="number" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value: number) => formatToMoney(value)} />
								<YAxis type="category" dataKey="rotulo" tickLine={false} axisLine={false} width={110} tick={{ fontSize: 10 }} />
								<ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
								<Bar dataKey="receber" fill="var(--color-receber)" radius={4} />
								<Bar dataKey="pagar" fill="var(--color-pagar)" radius={4} />
								<ChartLegend content={<ChartLegendContent />} className="-translate-y-2 flex-wrap gap-2 *:basis-1/3 *:justify-center" />
							</BarChart>
						</ChartContainer>
					</div>
				</div>

				<div className="flex w-full flex-col gap-2 lg:w-[45%]">
					<StatCard
						icon={<Timer className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-green-200 text-green-600"
						label={`ATRASO MÉDIO DE RECEBIMENTO (${data?.janelaAtrasoDias || 90}D)`}
						value={
							<div className="flex items-center gap-2">
								<h1
									className={cn("text-sm font-medium tabular-nums", {
										"text-red-600 dark:text-red-400": (data?.atrasoMedioRecebimentoDias || 0) > 0,
									})}
								>
									{formatDelayDays(data?.atrasoMedioRecebimentoDias ?? null)}
								</h1>
								<span className="text-[0.65rem] font-medium text-muted-foreground">{data?.recebimentosNaJanela || 0} transações</span>
							</div>
						}
					/>
					<StatCard
						icon={<Timer className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-red-200 text-red-600"
						label={`ATRASO MÉDIO DE PAGAMENTO (${data?.janelaAtrasoDias || 90}D)`}
						value={
							<div className="flex items-center gap-2">
								<h1
									className={cn("text-sm font-medium tabular-nums", {
										"text-red-600 dark:text-red-400": (data?.atrasoMedioPagamentoDias || 0) > 0,
									})}
								>
									{formatDelayDays(data?.atrasoMedioPagamentoDias ?? null)}
								</h1>
								<span className="text-[0.65rem] font-medium text-muted-foreground">{data?.pagamentosNaJanela || 0} transações</span>
							</div>
						}
					/>
					<StatCard
						icon={<ReceiptText className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-red-200 text-red-600"
						label="JUROS E MULTAS PAGOS"
						value={formatToMoney(data?.friccao.jurosMultasPagos || 0)}
					/>
					<StatCard
						icon={<HandCoins className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-green-200 text-green-600"
						label="DESCONTOS OBTIDOS"
						value={formatToMoney(data?.friccao.descontosObtidos || 0)}
					/>
					<StatCard
						icon={<Landmark className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-blue-200 text-blue-600"
						label="CAIXA DISPONÍVEL"
						value={formatToMoney(data?.liquidez.totalCaixa || 0)}
					/>
					<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
						<div className="flex w-full items-center justify-between gap-2">
							<div className="flex items-center justify-start gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 p-1 text-foreground">
									<Percent className="w-4 h-4 min-w-4 min-h-4" />
								</div>
								<h1 className="text-xs font-medium leading-none tracking-tight">TAXAS POR MÉTODO</h1>
							</div>
							<h1 className="text-sm font-medium tabular-nums">{formatToMoney(data?.friccao.taxasTotal || 0)}</h1>
						</div>
						<div className="flex w-full flex-col gap-2">
							{data?.friccao.taxasPorMetodo.map((row) => (
								<div key={row.metodo} className="flex w-full items-center justify-between gap-2">
									<h1 className="text-xs font-medium leading-none tracking-tight text-muted-foreground">{row.metodo}</h1>
									<h1 className="text-xs font-medium tabular-nums">{formatToMoney(row.total)}</h1>
								</div>
							))}
							{data && data.friccao.taxasPorMetodo.length === 0 ? (
								<p className="text-xs text-muted-foreground">Nenhuma taxa registrada no período.</p>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
