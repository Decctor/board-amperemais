"use client";

import type { TGetSellerStatsOutput } from "@/app/api/sellers/stats/route";
import { hexToRgba, useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { isValidNumber } from "@/lib/validation";
import { BadgeDollarSign, Calendar, CirclePlus } from "lucide-react";

// ---------------------------------------------------------------------------
// Primitivos compound: heatmap de resultados por período (dia/mês/dia da semana).
// Variants explícitos no fim do arquivo compõem exatamente as partes que precisam.
// ---------------------------------------------------------------------------

type TPeriodResult = { quantidade: number; total: number };

/** Escala de intensidade de cor normalizada (0.1–1.0) sobre os totais do conjunto. */
function makeIntensityScale(values: number[]) {
	const maxValue = Math.max(...values, 0);
	const minValue = Math.min(...values, 0);
	const range = maxValue - minValue;
	return (value: number) => {
		if (range === 0) return 0.3;
		return 0.1 + ((value - minValue) / range) * 0.9;
	};
}

function PeriodHeatmapFrame({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
	return (
		<TooltipProvider>
			<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">{title}</h1>
					<div className="flex items-center gap-2">{icon}</div>
				</div>
				{children}
			</div>
		</TooltipProvider>
	);
}

function PeriodHeatmapHighlights({ best, worst }: { best?: string | null; worst?: string | null }) {
	if (!best && !worst) return null;
	return (
		<div className="w-full flex flex-col gap-1">
			{best ? <div className="w-fit text-center self-center px-4 py-1 bg-green-100 text-green-600 text-xs rounded-lg font-medium">{best}</div> : null}
			{worst ? <div className="w-fit text-center self-center px-4 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium">{worst}</div> : null}
		</div>
	);
}

function PeriodHeatmapGrid({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cn("grid gap-2 w-full", className)}>{children}</div>;
}

function PeriodHeatmapCell({
	label,
	tooltipTitle,
	result,
	intensity,
	className,
}: {
	label: string;
	tooltipTitle: string;
	result?: TPeriodResult;
	intensity: number;
	className?: string;
}) {
	const { colors } = useOrgColors();
	const bgColor = result ? hexToRgba(colors.primary, intensity) : "transparent";
	const ticketMedio = result && result.quantidade > 0 ? result.total / result.quantidade : 0;

	return (
		<Tooltip>
			<TooltipTrigger
				delay={200}
				render={
					<div
						className={cn(
							"flex flex-col items-center justify-center rounded-md border border-border w-full gap-1 transition-all hover:scale-[1.02] cursor-pointer",
							className,
						)}
						style={{ backgroundColor: bgColor }}
					>
						<h1 className="text-xs font-bold tracking-tight uppercase">{label}</h1>
					</div>
				}
			/>
			{result ? (
				<TooltipContent className="min-w-[180px] p-3" style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
					<div className="flex flex-col gap-2">
						<h3 className="text-sm font-semibold mb-1">{tooltipTitle}</h3>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-1">
								<CirclePlus className="w-5 h-5 min-w-5 min-h-5" />
								<span className="text-xs font-medium tracking-tight">VENDAS</span>
							</div>
							<span className="text-sm font-bold">{formatDecimalPlaces(result.quantidade)}</span>
						</div>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-1">
								<BadgeDollarSign className="w-5 h-5 min-w-5 min-h-5" />
								<span className="text-xs font-medium tracking-tight">FATURAMENTO</span>
							</div>
							<span className="text-sm font-bold">{formatToMoney(result.total)}</span>
						</div>
						<div className="border-t border-border-foreground/80 mt-1 pt-2 flex flex-col gap-1">
							<div className="flex items-center justify-between gap-4">
								<span className="text-xs font-medium tracking-tight">TICKET MÉDIO</span>
								<span className="text-sm font-bold">{formatToMoney(ticketMedio)}</span>
							</div>
						</div>
					</div>
				</TooltipContent>
			) : (
				<TooltipContent className="p-3" style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
					<div className="flex flex-col gap-1">
						<h3 className="text-sm font-semibold">{tooltipTitle}</h3>
						<span className="text-xs">SEM DADOS</span>
					</div>
				</TooltipContent>
			)}
		</Tooltip>
	);
}

export const PeriodHeatmap = {
	Frame: PeriodHeatmapFrame,
	Highlights: PeriodHeatmapHighlights,
	Grid: PeriodHeatmapGrid,
	Cell: PeriodHeatmapCell,
};

// ---------------------------------------------------------------------------
// Variants explícitos: resultados agrupados do vendedor
// ---------------------------------------------------------------------------

type TSellerGroupedResults = TGetSellerStatsOutput["data"]["resultadosAgrupados"];

const MONTH_MAP: Record<number, string> = {
	1: "Janeiro",
	2: "Fevereiro",
	3: "Março",
	4: "Abril",
	5: "Maio",
	6: "Junho",
	7: "Julho",
	8: "Agosto",
	9: "Setembro",
	10: "Outubro",
	11: "Novembro",
	12: "Dezembro",
};

const WEEKDAY_MAP: Record<number, string> = {
	0: "Domingo",
	1: "Segunda",
	2: "Terça",
	3: "Quarta",
	4: "Quinta",
	5: "Sexta",
	6: "Sábado",
};

export function SellerResultsByMonthDayBlock({ data }: { data: TSellerGroupedResults["dia"] }) {
	const getIntensity = makeIntensityScale(data.map((item) => item.total));
	const bestDay = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).dia : null;
	const worstDay = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).dia : null;

	return (
		<PeriodHeatmap.Frame title="POR DIA DO MÊS" icon={<Calendar className="w-4 h-4 min-w-4 min-h-4" />}>
			<PeriodHeatmap.Highlights
				best={isValidNumber(bestDay) ? `O melhor dia para vender foi ${bestDay}` : null}
				worst={isValidNumber(worstDay) ? `O pior dia para vender foi ${worstDay}` : null}
			/>
			<PeriodHeatmap.Grid className="grid-cols-7">
				{Array.from({ length: 31 }).map((_, index) => {
					const result = data.find((item) => item.dia === index + 1);
					return (
						<PeriodHeatmap.Cell
							key={index.toString()}
							label={String(index + 1)}
							tooltipTitle={`DIA ${index + 1}`}
							result={result}
							intensity={result ? getIntensity(result.total) : 0}
							className="p-2 min-h-[60px]"
						/>
					);
				})}
			</PeriodHeatmap.Grid>
		</PeriodHeatmap.Frame>
	);
}

export function SellerResultsByMonthBlock({ data }: { data: TSellerGroupedResults["mes"] }) {
	const getIntensity = makeIntensityScale(data.map((item) => item.total));
	const bestMonth = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).mes : null;
	const worstMonth = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).mes : null;

	return (
		<PeriodHeatmap.Frame title="POR MÊS" icon={<Calendar className="w-4 h-4 min-w-4 min-h-4" />}>
			<PeriodHeatmap.Highlights
				best={isValidNumber(bestMonth) ? `O melhor mês para vender foi ${MONTH_MAP[bestMonth as number]}` : null}
				worst={isValidNumber(worstMonth) ? `O pior mês para vender foi ${MONTH_MAP[worstMonth as number]}` : null}
			/>
			<PeriodHeatmap.Grid className="grid-cols-3 grid-rows-4">
				{Array.from({ length: 12 }).map((_, index) => {
					const result = data.find((item) => item.mes === index + 1);
					return (
						<PeriodHeatmap.Cell
							key={index.toString()}
							label={MONTH_MAP[index + 1]}
							tooltipTitle={MONTH_MAP[index + 1]}
							result={result}
							intensity={result ? getIntensity(result.total) : 0}
							className="p-3 min-h-[70px]"
						/>
					);
				})}
			</PeriodHeatmap.Grid>
		</PeriodHeatmap.Frame>
	);
}

export function SellerResultsByWeekDayBlock({ data }: { data: TSellerGroupedResults["diaSemana"] }) {
	const getIntensity = makeIntensityScale(data.map((item) => item.total));
	const bestDay = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).diaSemana : null;
	const worstDay = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).diaSemana : null;

	return (
		<PeriodHeatmap.Frame title="POR DIA DA SEMANA" icon={<Calendar className="w-4 h-4 min-w-4 min-h-4" />}>
			<PeriodHeatmap.Highlights
				best={isValidNumber(bestDay) ? `O melhor dia da semana para vender foi ${WEEKDAY_MAP[bestDay as number]}` : null}
				worst={isValidNumber(worstDay) ? `O pior dia da semana para vender foi ${WEEKDAY_MAP[worstDay as number]}` : null}
			/>
			<PeriodHeatmap.Grid className="grid-cols-1">
				{Array.from({ length: 7 }).map((_, index) => {
					const result = data.find((item) => item.diaSemana === index);
					return (
						<PeriodHeatmap.Cell
							key={index.toString()}
							label={WEEKDAY_MAP[index]}
							tooltipTitle={WEEKDAY_MAP[index]}
							result={result}
							intensity={result ? getIntensity(result.total) : 0}
							className="p-3 min-h-[70px]"
						/>
					);
				})}
			</PeriodHeatmap.Grid>
		</PeriodHeatmap.Frame>
	);
}
