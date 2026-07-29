"use client";

import { hexToRgba, useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces } from "@/lib/formatting";
import type { TChatsStatsTimeseries } from "@/lib/queries/chats-stats";
import { cn } from "@/lib/utils";
import { CirclePlus, MessageSquareText } from "lucide-react";
import { useMemo, useState } from "react";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const DIAS_SEMANA_COMPLETOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const HORAS = Array.from({ length: 24 }, (_, hora) => hora);

type Metrica = "mensagensRecebidas" | "atendimentosAbertos";

const METRICAS = [
	{ id: "mensagensRecebidas", label: "Mensagens recebidas", icon: MessageSquareText },
	{ id: "atendimentosAbertos", label: "Atendimentos abertos", icon: CirclePlus },
] as const satisfies ReadonlyArray<{ id: Metrica; label: string; icon: typeof MessageSquareText }>;

type ChatsLoadHeatmapBlockProps = {
	timeseries: TChatsStatsTimeseries | undefined;
	isLoading: boolean;
};

function formatHourLabel(hour: number) {
	return `${hour}:00`;
}

function getColorIntensity(value: number, peak: number) {
	if (value === 0 || peak === 0) return 0;
	return 0.1 + (value / peak) * 0.9;
}

/**
 * Carga por dia da semana × hora.
 *
 * A faixa superior responde "qual dia concentra mais carga"; a grade responde "em que
 * horário isso acontece". As duas leituras usam escalas independentes para não achatar
 * diferenças entre dias quando existe um único pico horário.
 */
export function ChatsLoadHeatmapBlock({ timeseries, isLoading }: ChatsLoadHeatmapBlockProps) {
	const [metrica, setMetrica] = useState<Metrica>("mensagensRecebidas");
	const { colors } = useOrgColors();
	const metricaSelecionada = METRICAS.find((item) => item.id === metrica) ?? METRICAS[0];

	const { grade, picoHorario, totaisPorDia, picoDiario } = useMemo(() => {
		const celulas = new Map<string, number>();
		const totais = Array.from({ length: 7 }, () => 0);
		let maiorHorario = 0;

		for (const celula of timeseries?.carga ?? []) {
			const valor = celula[metrica];
			celulas.set(`${celula.diaSemana}-${celula.hora}`, valor);
			totais[celula.diaSemana] = (totais[celula.diaSemana] ?? 0) + valor;
			if (valor > maiorHorario) maiorHorario = valor;
		}

		return {
			grade: celulas,
			picoHorario: maiorHorario,
			totaisPorDia: totais,
			picoDiario: Math.max(...totais, 0),
		};
	}, [timeseries, metrica]);

	if (isLoading) return <div className="h-[420px] w-full animate-pulse rounded-xl border border-border bg-muted/40" />;

	return (
		<TooltipProvider>
			<div className="flex min-h-[420px] w-full flex-col gap-3 rounded-xl border border-border bg-card px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 flex-col gap-1">
						<h2 className="text-xs font-medium tracking-tight uppercase">CARGA POR HORA</h2>
						<p className="text-[0.65rem] text-muted-foreground italic">Concentração por dia da semana e hora, no fuso da operação.</p>
					</div>

					<div className="flex shrink-0 items-center gap-2">
						{METRICAS.map((item) => {
							const Icon = item.icon;
							return (
								<Tooltip key={item.id}>
									<TooltipTrigger asChild>
										<Button
											variant={metrica === item.id ? "default" : "ghost"}
											size="fit"
											className="rounded-lg p-2"
											aria-label={item.label}
											onClick={() => setMetrica(item.id)}
										>
											<Icon className="h-4 min-h-4 w-4 min-w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>{item.label}</p>
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</div>

				{picoHorario === 0 ? (
					<div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Nenhum movimento no período.</div>
				) : (
					<div className="flex min-h-0 flex-1 flex-col gap-3">
						<div className="flex w-full gap-1.5">
							{DIAS_SEMANA.map((rotulo, diaSemana) => {
								const valor = totaisPorDia[diaSemana] ?? 0;
								const intensidade = getColorIntensity(valor, picoDiario);
								return (
									<Tooltip key={rotulo} delayDuration={150}>
										<TooltipTrigger asChild>
											<button
												type="button"
												className="flex min-h-11 min-w-0 flex-1 cursor-default flex-col items-center justify-center rounded-md border border-border px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												style={{
													backgroundColor: valor > 0 ? hexToRgba(colors.primary, intensidade) : "rgba(0,0,0,0.03)",
													color: valor > 0 ? hexToRgba(colors.primaryForeground, 0.8) : undefined,
												}}
											>
												<span className="text-[0.6rem] font-bold tracking-tight uppercase">{rotulo}</span>
												<span className="max-w-full truncate text-center text-[0.6rem] font-medium text-foreground/80">
													{valor > 0 ? formatDecimalPlaces(valor, 0, 0) : "—"}
												</span>
											</button>
										</TooltipTrigger>
										<TooltipContent
											className="min-w-44 p-3"
											style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
										>
											<div className="flex items-center justify-between gap-4">
												<span className="text-xs font-medium">{DIAS_SEMANA_COMPLETOS[diaSemana]}</span>
												<span className="text-sm font-bold">{formatDecimalPlaces(valor, 0, 0)}</span>
											</div>
											<p className="mt-1 text-[11px]">{metricaSelecionada.label}</p>
										</TooltipContent>
									</Tooltip>
								);
							})}
						</div>

						<div className="flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden">
							<div className="flex h-full min-h-[200px] min-w-[520px] w-full flex-col overflow-hidden">
								<div className="flex shrink-0 gap-0.5 pl-12">
									{HORAS.map((hora) => (
										<div key={hora} className="flex min-w-0 flex-1 items-center justify-center text-[0.6rem] text-muted-foreground">
											{formatHourLabel(hora)}
										</div>
									))}
								</div>

								<div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5">
									{DIAS_SEMANA.map((rotulo, diaSemana) => (
										<div key={rotulo} className="flex min-h-0 flex-1 items-stretch gap-1">
											<div className="flex w-10 shrink-0 items-center text-[0.65rem] font-medium text-muted-foreground">{rotulo}</div>
											<div className="flex min-w-0 flex-1 gap-0.5">
												{HORAS.map((hora) => {
													const valor = grade.get(`${diaSemana}-${hora}`) ?? 0;
													const intensidade = getColorIntensity(valor, picoHorario);
													return (
														<Tooltip key={hora} delayDuration={150}>
															<TooltipTrigger asChild>
																<div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-0.5">
																	<button
																		type="button"
																		aria-label={`${DIAS_SEMANA_COMPLETOS[diaSemana]} às ${formatHourLabel(hora)}: ${formatDecimalPlaces(valor, 0, 0)} ${metricaSelecionada.label.toLocaleLowerCase("pt-BR")}`}
																		className={cn(
																			"aspect-square max-h-full w-full max-w-full cursor-default rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
																			valor === 0 && "bg-muted/40",
																		)}
																		style={valor > 0 ? { backgroundColor: hexToRgba(colors.primary, intensidade) } : undefined}
																	/>
																</div>
															</TooltipTrigger>
															<TooltipContent
																className="min-w-44 p-3"
																style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
															>
																<div className="flex flex-col gap-2">
																	<h3 className="text-sm font-semibold">
																		{DIAS_SEMANA_COMPLETOS[diaSemana]} às {formatHourLabel(hora)}
																	</h3>
																	<div className="flex items-center justify-between gap-4">
																		<span className="text-xs font-medium">{metricaSelecionada.label}</span>
																		<span className="text-sm font-bold">{formatDecimalPlaces(valor, 0, 0)}</span>
																	</div>
																</div>
															</TooltipContent>
														</Tooltip>
													);
												})}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}

				<p className="shrink-0 text-[11px] text-muted-foreground">
					Pico da grade: {formatDecimalPlaces(picoHorario, 0, 0)} por hora. A intensidade é relativa a ele.
				</p>
			</div>
		</TooltipProvider>
	);
}
