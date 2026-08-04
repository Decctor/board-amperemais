"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { TGoalPacingSeriesPoint } from "@/lib/goals/pacing";
import { formatToMoney } from "@/lib/formatting";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

/**
 * Esperado acumulado contra realizado acumulado ao longo do período.
 *
 * É o único desenho que torna "adiantado ou atrasado" legível no tempo em vez de um número solto:
 * a distância vertical entre a linha e a área **é** a diferença, e a inclinação mostra se ela está
 * abrindo ou fechando.
 *
 * O realizado vem nulo para os dias futuros (ver `buildGoalPacingSeries`), então a área simplesmente
 * termina em vez de despencar — uma queda a pique no dia seguinte leria como colapso de vendas.
 */

function GoalPaceCurveTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number | null; name: string; color: string }[]; label?: string }) {
	if (!active || !payload?.length) return null;

	return (
		<div className="rounded-lg border border-border bg-background p-3 text-xs shadow-lg">
			<p className="mb-2 font-bold">{label}</p>
			<div className="flex flex-col gap-1">
				{payload.map((item) => (
					<div key={item.name} className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
						<span className="text-muted-foreground">{item.name}:</span>
						<span className="font-bold tabular-nums">{item.value === null ? "—" : formatToMoney(item.value)}</span>
					</div>
				))}
			</div>
		</div>
	);
}

type GoalPaceCurveChartProps = {
	curva: TGoalPacingSeriesPoint[];
	origemDistribuicao: "HISTORICO" | "LINEAR";
};

export default function GoalPaceCurveChart({ curva, origemDistribuicao }: GoalPaceCurveChartProps) {
	const { colors } = useOrgColors();

	const chartConfig = {
		realizadoAcumulado: { label: "Realizado", color: colors.primary },
		objetivoAcumulado: { label: "Esperado", color: "var(--color-muted-foreground)" },
	} satisfies ChartConfig;

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-xs font-extrabold uppercase tracking-[0.08em]">Ritmo acumulado</h3>
				<div className="flex items-center gap-4 text-[0.68rem] text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span className="h-0.5 w-4 rounded-full bg-muted-foreground" />
						Esperado
					</span>
					<span className="flex items-center gap-1.5">
						<span className="h-2 w-4 rounded-sm" style={{ backgroundColor: colors.primary }} />
						Realizado
					</span>
				</div>
			</div>

			<ChartContainer config={chartConfig} className="h-56 w-full">
				<ComposedChart data={curva} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
					<defs>
						<linearGradient id="goalPaceRealizado" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={colors.primary} stopOpacity={0.28} />
							<stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
						</linearGradient>
					</defs>
					<CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
					<XAxis dataKey="rotulo" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
					<YAxis tickFormatter={(value) => formatToMoney(value)} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={78} />
					<ChartTooltip content={<GoalPaceCurveTooltip />} />
					<Area
						dataKey="realizadoAcumulado"
						name="Realizado"
						type="monotone"
						stroke={colors.primary}
						strokeWidth={2}
						fill="url(#goalPaceRealizado)"
						connectNulls={false}
						dot={false}
						isAnimationActive={false}
					/>
					<Line
						dataKey="objetivoAcumulado"
						name="Esperado"
						type="monotone"
						stroke="var(--color-muted-foreground)"
						strokeWidth={1.5}
						strokeDasharray="4 4"
						dot={false}
						isAnimationActive={false}
					/>
				</ComposedChart>
			</ChartContainer>

			<p className="text-[0.68rem] text-muted-foreground">
				{origemDistribuicao === "HISTORICO"
					? "Metas diárias ponderadas pelo histórico de vendas dos últimos 90 dias."
					: "Distribuição linear entre os dias do período — histórico de vendas insuficiente para ponderar."}
			</p>
		</div>
	);
}
