"use client";

import { Button } from "@/components/ui/button";
import { formatDecimalPlaces } from "@/lib/formatting";
import type { TChatsStatsTimeseries } from "@/lib/queries/chats-stats";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Metrica = "mensagensRecebidas" | "atendimentosAbertos";

const METRICAS: { id: Metrica; label: string }[] = [
	{ id: "mensagensRecebidas", label: "Mensagens recebidas" },
	{ id: "atendimentosAbertos", label: "Atendimentos abertos" },
];

type ChatsLoadHeatmapBlockProps = {
	timeseries: TChatsStatsTimeseries | undefined;
	isLoading: boolean;
};

/**
 * Carga por dia da semana × hora.
 *
 * É a única leitura da aba que dimensiona escala: dois dias com o mesmo total podem ter
 * concentrações completamente diferentes, e a série diária não distingue os dois casos.
 *
 * A intensidade é relativa ao pico da grade, não a um limiar absoluto — o que interessa é
 * a forma da distribuição, e uma operação pequena tem a mesma forma que uma grande.
 */
export function ChatsLoadHeatmapBlock({ timeseries, isLoading }: ChatsLoadHeatmapBlockProps) {
	const [metrica, setMetrica] = useState<Metrica>("mensagensRecebidas");

	const { grade, pico } = useMemo(() => {
		const celulas = new Map<string, number>();
		let maior = 0;
		for (const celula of timeseries?.carga ?? []) {
			const valor = celula[metrica];
			celulas.set(`${celula.diaSemana}-${celula.hora}`, valor);
			if (valor > maior) maior = valor;
		}
		return { grade: celulas, pico: maior };
	}, [timeseries, metrica]);

	if (isLoading) return <div className="h-[280px] w-full animate-pulse rounded-2xl border border-border bg-muted/40" />;

	return (
		<div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col">
					<h2 className="text-sm font-bold tracking-tight">CARGA POR HORA</h2>
					<p className="text-xs text-muted-foreground">Concentração por dia da semana e hora, no fuso da operação.</p>
				</div>
				<div className="flex items-center gap-1">
					{METRICAS.map((item) => (
						<Button
							key={item.id}
							variant={metrica === item.id ? "default" : "ghost"}
							size="sm"
							className="h-7 text-[11px]"
							onClick={() => setMetrica(item.id)}
						>
							{item.label}
						</Button>
					))}
				</div>
			</div>

			{pico === 0 ? (
				<div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">Nenhum movimento no período.</div>
			) : (
				<div className="scrollbar-subtle w-full overflow-x-auto">
					<div className="flex min-w-[640px] flex-col gap-1">
						<div className="flex items-center gap-1 pl-9">
							{Array.from({ length: 24 }, (_, hora) => (
								<span key={hora} className="w-5 shrink-0 text-center text-[9px] text-muted-foreground">
									{hora % 3 === 0 ? hora : ""}
								</span>
							))}
						</div>

						{DIAS_SEMANA.map((rotulo, diaSemana) => (
							<div key={rotulo} className="flex items-center gap-1">
								<span className="w-8 shrink-0 text-[10px] text-muted-foreground">{rotulo}</span>
								{Array.from({ length: 24 }, (_, hora) => {
									const valor = grade.get(`${diaSemana}-${hora}`) ?? 0;
									const intensidade = valor / pico;
									return (
										<span
											key={hora}
											title={`${rotulo}, ${String(hora).padStart(2, "0")}h — ${formatDecimalPlaces(valor, 0, 0)}`}
											className={cn("h-5 w-5 shrink-0 rounded-sm", valor === 0 && "bg-muted")}
											// Opacidade em vez de escala de cor: mantém a paleta fechada do
											// DESIGN.md e ainda assim ordena visualmente as 168 células.
											style={valor > 0 ? { backgroundColor: "var(--color-primary)", opacity: 0.15 + intensidade * 0.85 } : undefined}
										/>
									);
								})}
							</div>
						))}
					</div>
				</div>
			)}

			<p className="text-[11px] text-muted-foreground">
				Pico da grade: {formatDecimalPlaces(pico, 0, 0)} por hora. A intensidade é relativa a ele.
			</p>
		</div>
	);
}
