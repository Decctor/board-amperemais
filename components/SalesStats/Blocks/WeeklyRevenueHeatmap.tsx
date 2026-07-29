"use client";

import { hexToRgba, useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { BadgeDollarSign, CirclePlus, Flame } from "lucide-react";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Análise de faturamento semanal (faixa por dia + heatmap dias × horas).
// Compound reutilizável: dashboard da organização (com drilldown) e superfícies
// do vendedor (sem drilldown). Tipos estruturais — cada caller mapeia seus dados.
// ---------------------------------------------------------------------------

export type TWeekDayPoint = { diaSemana: number; qtde: number; total: number };
export type TWeekDayHourPoint = { diaSemana: number; hora: number; qtde: number; total: number };
/** Drilldown sem período — o caller fecha sobre o próprio período ao adaptar os params. */
export type TWeeklyDrilldownParams = { weekday: number; hourIntervalStart?: number; hourIntervalEnd?: number };

const WEEKDAY_MAP_SHORT: Record<number, string> = {
	0: "Dom",
	1: "Seg",
	2: "Ter",
	3: "Qua",
	4: "Qui",
	5: "Sex",
	6: "Sáb",
};

const WEEKDAY_MAP_FULL: Record<number, string> = {
	0: "Domingo",
	1: "Segunda",
	2: "Terça",
	3: "Quarta",
	4: "Quinta",
	5: "Sexta",
	6: "Sábado",
};

function formatHourLabel(hour: number): string {
	return `${hour}:00`;
}

function WeeklyRevenueHeatmapFrame({ hint, children }: { hint: string; children: React.ReactNode }) {
	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs min-h-[420px]">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">ANÁLISE DE FATURAMENTO SEMANAL</h1>
				<div className="flex items-center gap-2">
					<Flame className="w-4 h-4 min-w-4 min-h-4" />
				</div>
			</div>
			<p className="text-[0.65rem] text-muted-foreground italic shrink-0">{hint}</p>
			<div className="flex flex-col gap-3 flex-1 min-h-0">{children}</div>
		</div>
	);
}

/** Faixa horizontal com 7 dias: total por dia da semana (resumo acima do heatmap). */
function WeeklyRevenueHeatmapWeekDayStrip({
	data,
	onSelectDrilldown,
}: {
	data: TWeekDayPoint[];
	onSelectDrilldown?: (params: TWeeklyDrilldownParams) => void;
}) {
	const { colors } = useOrgColors();
	const maxValue = Math.max(...data.map((item) => item.total), 0);
	const minValue = Math.min(...data.map((item) => item.total), 0);
	const range = maxValue - minValue;

	function getWeekDayResult(index: number) {
		return data.find((item) => Number(item.diaSemana) === index);
	}

	function getColorIntensity(value: number): number {
		if (range === 0) return 0.3;
		const normalized = (value - minValue) / range;
		return 0.1 + normalized * 0.9;
	}

	function DayCell({ index }: { index: number }) {
		const result = getWeekDayResult(index);
		const intensity = result ? getColorIntensity(result.total) : 0;
		const bgColor = result ? hexToRgba(colors.primary, intensity) : "rgba(0,0,0,0.03)";
		const textColor = result ? hexToRgba(colors.primaryForeground, 0.8) : "rgba(0,0,0,0.5)";
		const ticketMedio = result && result.qtde > 0 ? result.total / result.qtde : 0;

		return (
			<Tooltip delayDuration={150}>
				<TooltipTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex flex-col items-center justify-center py-2 px-1 rounded-md border border-border min-h-[44px] min-w-0 flex-1 transition-all",
							onSelectDrilldown ? "hover:scale-[1.02] cursor-pointer" : "cursor-default",
						)}
						style={{ backgroundColor: bgColor, color: textColor }}
						onClick={onSelectDrilldown ? () => onSelectDrilldown({ weekday: index }) : undefined}
					>
						<span className="text-[0.6rem] font-bold tracking-tight uppercase">{WEEKDAY_MAP_SHORT[index]}</span>
						{result ? (
							<span className="text-[0.6rem] font-medium text-foreground/80 truncate max-w-full text-center">{formatToMoney(result.total)}</span>
						) : (
							<span className="text-[0.6rem] text-foreground/80">—</span>
						)}
					</button>
				</TooltipTrigger>
				{result ? (
					<TooltipContent className="min-w-[180px] p-3" style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
						<div className="flex flex-col gap-2">
							<h3 className="text-sm font-semibold mb-1">{WEEKDAY_MAP_FULL[index]}</h3>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-1">
									<CirclePlus className="w-5 h-5 min-w-5 min-h-5" />
									<span className="text-xs font-medium tracking-tight">VENDAS</span>
								</div>
								<span className="text-sm font-bold">{formatDecimalPlaces(result.qtde)}</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-1">
									<BadgeDollarSign className="w-5 h-5 min-w-5 min-h-5" />
									<span className="text-xs font-medium tracking-tight">FATURAMENTO</span>
								</div>
								<span className="text-sm font-bold">{formatToMoney(result.total)}</span>
							</div>
							<div className="border-t border-border-foreground/80 mt-1 pt-2">
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
							<h3 className="text-sm font-semibold">{WEEKDAY_MAP_FULL[index]}</h3>
							<span className="text-xs">SEM DADOS</span>
						</div>
					</TooltipContent>
				)}
			</Tooltip>
		);
	}

	return (
		<TooltipProvider>
			<div className="flex gap-1.5 w-full">
				{[0, 1, 2, 3, 4, 5, 6].map((diaIndex) => (
					<DayCell key={WEEKDAY_MAP_SHORT[diaIndex]} index={diaIndex} />
				))}
			</div>
		</TooltipProvider>
	);
}

/** Grid do heatmap: dias × 24 horas, com scroll horizontal próprio. */
function WeeklyRevenueHeatmapGrid({
	data,
	onSelectDrilldown,
}: {
	data: TWeekDayHourPoint[];
	onSelectDrilldown?: (params: TWeeklyDrilldownParams) => void;
}) {
	const { colors } = useOrgColors();
	const dataMap = useMemo(() => {
		const map = new Map<string, { qtde: number; total: number }>();
		for (const item of data) {
			map.set(`${item.diaSemana}-${item.hora}`, { qtde: item.qtde, total: item.total });
		}
		return map;
	}, [data]);

	const maxTotal = useMemo(() => (data.length > 0 ? Math.max(...data.map((d) => d.total)) : 0), [data]);

	function getCellValue(diaSemana: number, hora: number) {
		return dataMap.get(`${diaSemana}-${hora}`);
	}

	function getColorIntensity(value: number): number {
		if (maxTotal === 0) return 0;
		const normalized = value / maxTotal;
		return 0.1 + normalized * 0.9;
	}

	const HOURS = Array.from({ length: 24 }, (_, i) => i);

	function HeatmapCell({ diaSemana, hora }: { diaSemana: number; hora: number }) {
		const result = getCellValue(diaSemana, hora);
		const intensity = result ? getColorIntensity(result.total) : 0;
		const bgColor = result ? hexToRgba(colors.primary, intensity) : "rgba(0,0,0,0.03)";
		const ticketMedio = result && result.qtde > 0 ? result.total / result.qtde : 0;

		return (
			<Tooltip delayDuration={150}>
				<TooltipTrigger asChild>
					<div className="flex-1 min-w-0 min-h-0 flex items-center justify-center p-0.5">
						<button
							type="button"
							className={cn(
								"w-full aspect-square max-w-full max-h-full rounded-full transition-all border border-border",
								onSelectDrilldown ? "hover:scale-110 hover:z-10 cursor-pointer" : "cursor-default",
							)}
							style={{ backgroundColor: bgColor }}
							onClick={onSelectDrilldown ? () => onSelectDrilldown({ weekday: diaSemana, hourIntervalStart: hora, hourIntervalEnd: hora + 1 }) : undefined}
						/>
					</div>
				</TooltipTrigger>
				{result ? (
					<TooltipContent className="min-w-[180px] p-3" style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
						<div className="flex flex-col gap-2">
							<h3 className="text-sm font-semibold">
								{WEEKDAY_MAP_SHORT[diaSemana]} às {formatHourLabel(hora)}
							</h3>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-1">
									<CirclePlus className="w-4 h-4 min-w-4 min-h-4" />
									<span className="text-xs font-medium tracking-tight">VENDAS</span>
								</div>
								<span className="text-sm font-bold">{formatDecimalPlaces(result.qtde)}</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-1">
									<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />
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
							<h3 className="text-sm font-semibold">
								{WEEKDAY_MAP_SHORT[diaSemana]} às {formatHourLabel(hora)}
							</h3>
							<span className="text-xs">SEM DADOS</span>
						</div>
					</TooltipContent>
				)}
			</Tooltip>
		);
	}

	return (
		<TooltipProvider>
			<div className="flex-1 min-h-0 flex flex-col overflow-x-auto overflow-y-hidden">
				<div className="w-full h-full min-h-[200px] min-w-[520px] flex flex-col overflow-hidden">
					{/* Eixo horizontal: horas */}
					<div className="flex gap-0.5 pl-12 shrink-0">
						{HOURS.map((h) => (
							<div key={h} className="flex-1 min-w-0 flex items-center justify-center text-[0.6rem] text-muted-foreground">
								{formatHourLabel(h)}
							</div>
						))}
					</div>
					{/* Grid: dias x horas - ocupa o espaço restante */}
					<div className="flex-1 min-h-0 flex flex-col gap-0.5 mt-1">
						{[0, 1, 2, 3, 4, 5, 6].map((diaSemana) => (
							<div key={diaSemana} className="flex-1 min-h-0 flex items-stretch gap-1">
								<div className="w-10 shrink-0 flex items-center text-[0.65rem] font-medium text-muted-foreground">{WEEKDAY_MAP_SHORT[diaSemana]}</div>
								<div className="flex-1 min-w-0 flex gap-0.5">
									{HOURS.map((hora) => (
										<HeatmapCell key={`${diaSemana}-${hora}`} diaSemana={diaSemana} hora={hora} />
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}

export const WeeklyRevenueHeatmap = {
	Frame: WeeklyRevenueHeatmapFrame,
	WeekDayStrip: WeeklyRevenueHeatmapWeekDayStrip,
	Grid: WeeklyRevenueHeatmapGrid,
};
