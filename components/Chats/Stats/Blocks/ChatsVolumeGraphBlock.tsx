"use client";

import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatDecimalPlaces, formatDurationFromSeconds } from "@/lib/formatting";
import type { TChatsStatsTimeseries } from "@/lib/queries/chats-stats";
import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { CHAT_STATS_CHART_COLORS } from "../config";

const chartConfig = {
	abertos: { label: "Abertos", color: CHAT_STATS_CHART_COLORS.azul },
	encerrados: { label: "Encerrados", color: CHAT_STATS_CHART_COLORS.ouro },
	primeiraResposta: { label: "1ª resposta (mediana)", color: CHAT_STATS_CHART_COLORS.bronzeEscuro },
} satisfies ChartConfig;

type TooltipProps = {
	active?: boolean;
	payload?: Array<{ name: string; value: number | null; color: string }>;
	label?: string;
};

function VolumeTooltip({ active, payload, label }: TooltipProps) {
	if (!active || !payload?.length) return null;
	return (
		<div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background p-3 text-xs shadow-lg">
			<p className="font-bold text-foreground">{label}</p>
			{payload.map((item) => (
				<div key={item.name} className="flex items-center gap-2">
					<div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
					<span className="text-muted-foreground">{chartConfig[item.name as keyof typeof chartConfig]?.label ?? item.name}:</span>
					<span className="font-bold text-foreground">
						{item.name === "primeiraResposta" ? formatDurationFromSeconds(item.value) : formatDecimalPlaces(item.value ?? 0, 0, 0)}
					</span>
				</div>
			))}
		</div>
	);
}

type ChatsVolumeGraphBlockProps = {
	timeseries: TChatsStatsTimeseries | undefined;
	isLoading: boolean;
};

/**
 * Abertos × encerrados em barras, com a mediana de primeira resposta em linha num eixo
 * próprio. É o gráfico que responde se a equipe está fechando o que abre — e a que custo
 * de tempo, que é a metade da pergunta que o volume sozinho esconde.
 */
export function ChatsVolumeGraphBlock({ timeseries, isLoading }: ChatsVolumeGraphBlockProps) {
	const pontos = useMemo(() => {
		if (!timeseries) return [];
		return timeseries.serie.map((ponto) => ({
			label: new Date(ponto.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
			abertos: ponto.abertos,
			encerrados: ponto.encerrados,
			primeiraResposta: ponto.primeiraRespostaMediana,
		}));
	}, [timeseries]);

	if (isLoading) return <div className="h-[300px] w-full animate-pulse rounded-2xl border border-border bg-muted/40" />;

	return (
		<div className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
			<div className="flex flex-col">
				<h2 className="text-sm font-bold tracking-tight">VOLUME DE ATENDIMENTOS</h2>
				<p className="text-xs text-muted-foreground">
					Abertos e encerrados por {timeseries?.granularidade === "SEMANA" ? "semana" : "dia"}, com a mediana de primeira resposta.
				</p>
			</div>

			{pontos.length === 0 ? (
				<div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">Nenhum atendimento no período.</div>
			) : (
				<ChartContainer config={chartConfig} className="h-[260px] w-full">
					<ComposedChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px]" />
						<YAxis yAxisId="volume" tickLine={false} axisLine={false} allowDecimals={false} className="text-[10px]" />
						<YAxis
							yAxisId="tempo"
							orientation="right"
							tickLine={false}
							axisLine={false}
							className="text-[10px]"
							tickFormatter={(value: number) => formatDurationFromSeconds(value)}
						/>
						<ChartTooltip content={<VolumeTooltip />} />
						<Bar yAxisId="volume" dataKey="abertos" fill={chartConfig.abertos.color} radius={[4, 4, 0, 0]} />
						<Bar yAxisId="volume" dataKey="encerrados" fill={chartConfig.encerrados.color} radius={[4, 4, 0, 0]} />
						{/* `connectNulls` fecharia o buraco de um dia sem nenhuma resposta medida,
						    desenhando uma continuidade que não existiu. */}
						<Line
							yAxisId="tempo"
							type="monotone"
							dataKey="primeiraResposta"
							stroke={chartConfig.primeiraResposta.color}
							strokeWidth={2}
							dot={false}
							connectNulls={false}
						/>
					</ComposedChart>
				</ChartContainer>
			)}
		</div>
	);
}
