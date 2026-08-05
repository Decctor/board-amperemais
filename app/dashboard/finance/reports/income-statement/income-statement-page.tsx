"use client";

import dayjs from "dayjs";
import { ChartNoAxesColumnIncreasing, FileSpreadsheet } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { useFinancesDre } from "@/lib/queries/finance-analytics";
import { DreStatementLine } from "./_components/dre-statement-line";

const trendChartConfig = {
	receita: {
		label: "RECEITA",
		color: "#16a34a",
	},
	custo: {
		label: "CUSTOS",
		color: "#ea580c",
	},
	despesa: {
		label: "DESPESAS",
		color: "#dc2626",
	},
	resultado: {
		label: "RESULTADO",
		color: "#2563eb",
	},
} satisfies ChartConfig;

export default function IncomeStatementPage() {
	const { data: dre, isError, error, params, updateParams } = useFinancesDre({ initialParams: {} });

	const demonstrativo = dre?.demonstrativo;
	const revenueTotal = demonstrativo?.receita.total || 0;

	return (
		<div className="flex h-full w-full flex-col gap-4">
			<div className="flex min-h-8 items-center justify-between">
				<h1 className="text-xs font-bold tracking-tight uppercase">DRE GERENCIAL (COMPETÊNCIA)</h1>
				<div className="w-fit">
					<DateIntervalInput
						label="PERÍODO"
						labelClassName="hidden"
						className="hover:bg-accent hover:text-accent-foreground border-none shadow-none"
						value={{ after: params.periodAfter, before: params.periodBefore }}
						handleChange={(value) => updateParams({ periodAfter: value.after ?? params.periodAfter, periodBefore: value.before ?? params.periodBefore })}
					/>
				</div>
			</div>

			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

			<div className="flex w-full flex-col gap-4 xl:flex-row">
				<div className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-4 shadow-2xs xl:w-[45%]">
					<div className="flex w-full items-center justify-between gap-2">
						<div className="flex items-center justify-start gap-2">
							<FileSpreadsheet className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="text-xs font-medium leading-none tracking-tight">DEMONSTRATIVO DO PERÍODO</h1>
						</div>
						<span className="text-[0.65rem] font-medium text-muted-foreground">% REC · Δ ANTERIOR · VALOR</span>
					</div>
					{demonstrativo ? (
						<div className="flex w-full flex-col gap-1">
							<DreStatementLine
								label="RECEITA BRUTA"
								total={demonstrativo.receita.total}
								totalAnterior={demonstrativo.receita.totalAnterior}
								revenueTotal={revenueTotal}
								tree={demonstrativo.receita.arvore}
							/>
							<DreStatementLine
								label="CUSTOS"
								prefix="(−)"
								total={demonstrativo.custos.total}
								totalAnterior={demonstrativo.custos.totalAnterior}
								revenueTotal={revenueTotal}
								invertDelta
								tree={demonstrativo.custos.arvore}
							/>
							<DreStatementLine
								label="LUCRO BRUTO"
								prefix="(=)"
								total={demonstrativo.lucroBruto.total}
								totalAnterior={demonstrativo.lucroBruto.totalAnterior}
								revenueTotal={revenueTotal}
								emphasized
								margem={demonstrativo.lucroBruto.margem}
							/>
							<DreStatementLine
								label="DESPESAS"
								prefix="(−)"
								total={demonstrativo.despesas.total}
								totalAnterior={demonstrativo.despesas.totalAnterior}
								revenueTotal={revenueTotal}
								invertDelta
								tree={demonstrativo.despesas.arvore}
							/>
							<DreStatementLine
								label="RESULTADO OPERACIONAL"
								prefix="(=)"
								total={demonstrativo.resultado.total}
								totalAnterior={demonstrativo.resultado.totalAnterior}
								revenueTotal={revenueTotal}
								emphasized
								margem={demonstrativo.resultado.margem}
							/>
						</div>
					) : (
						<p className="py-4 text-center text-xs text-muted-foreground">Buscando demonstrativo...</p>
					)}
				</div>

				<div className="bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs xl:w-[55%]">
					<div className="flex w-full items-center justify-between gap-2">
						<div className="flex items-center justify-start gap-2">
							<ChartNoAxesColumnIncreasing className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="text-xs font-medium leading-none tracking-tight">EVOLUÇÃO 12 MESES</h1>
						</div>
					</div>
					<div className="h-[320px] w-full">
						<ChartContainer config={trendChartConfig} className="aspect-auto h-full w-full">
							<ComposedChart accessibilityLayer data={dre?.serie || []}>
								<CartesianGrid vertical={false} strokeWidth={0.2} />
								<YAxis tickLine={false} tickMargin={10} axisLine={false} width={80} tickFormatter={(value: number) => formatToMoney(value)} />
								<XAxis
									dataKey="mes"
									tickLine={false}
									tickMargin={10}
									axisLine={false}
									minTickGap={16}
									tickFormatter={(value: string) => dayjs(`${value}-01`).format("MM/YY")}
								/>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator="dashed" labelFormatter={(value) => dayjs(`${value as string}-01`).format("MMM/YYYY")} />}
								/>
								<Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
								<Bar dataKey="custo" fill="var(--color-custo)" radius={4} />
								<Bar dataKey="despesa" fill="var(--color-despesa)" radius={4} />
								<Line dataKey="resultado" type="monotone" stroke="var(--color-resultado)" strokeWidth={2} dot={false} />
								<ChartLegend content={<ChartLegendContent />} className="-translate-y-2 flex-wrap gap-2 *:basis-1/5 *:justify-center" />
							</ComposedChart>
						</ChartContainer>
					</div>
				</div>
			</div>
		</div>
	);
}
