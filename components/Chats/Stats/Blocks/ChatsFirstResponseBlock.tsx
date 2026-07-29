"use client";

import { formatDecimalPlaces } from "@/lib/formatting";
import type { TChatsStatsOverview } from "@/lib/queries/chats-stats";
import { cn } from "@/lib/utils";

type ChatsFirstResponseBlockProps = {
	overview: TChatsStatsOverview | undefined;
	isLoading: boolean;
};

/**
 * Histograma das faixas de primeira resposta.
 *
 * Complementa a mediana em vez de repeti-la: duas operações com a mesma mediana e caudas
 * diferentes são operações diferentes, e é a cauda que gera reclamação.
 */
export function ChatsFirstResponseBlock({ overview, isLoading }: ChatsFirstResponseBlockProps) {
	if (isLoading) return <div className="h-[260px] w-full animate-pulse rounded-2xl border border-border bg-muted/40" />;

	const faixas = overview?.sla.faixas ?? [];
	const semResposta = overview?.volume.semPrimeiraResposta ?? 0;
	const maior = Math.max(1, ...faixas.map((faixa) => faixa.quantidade), semResposta);
	const respondidos = faixas.reduce((soma, faixa) => soma + faixa.quantidade, 0);

	const linhas = [
		...faixas.map((faixa) => ({ id: faixa.id, label: faixa.label, quantidade: faixa.quantidade, alerta: false })),
		// "Sem resposta" não é a faixa mais lenta — é uma categoria à parte, e misturá-la
		// com "acima de 4h" esconderia o pior resultado possível dentro de um número ruim.
		{ id: "SEM_RESPOSTA", label: "Sem resposta", quantidade: semResposta, alerta: true },
	];

	return (
		<div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
			<div className="flex flex-col">
				<h2 className="text-sm font-bold tracking-tight">TEMPO DE PRIMEIRA RESPOSTA</h2>
				<p className="text-xs text-muted-foreground">Distribuição dos atendimentos abertos no período.</p>
			</div>

			{respondidos === 0 && semResposta === 0 ? (
				<div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">Nenhum atendimento no período.</div>
			) : (
				<div className="flex flex-col gap-2">
					{linhas.map((linha) => (
						<div key={linha.id} className="flex items-center gap-3">
							<span className={cn("w-28 shrink-0 text-[11px]", linha.alerta ? "font-bold text-destructive" : "text-muted-foreground")}>
								{linha.label}
							</span>
							<div className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
								<div
									className={cn("h-full rounded-full transition-all", linha.alerta ? "bg-destructive" : "bg-primary")}
									style={{ width: `${(linha.quantidade / maior) * 100}%` }}
								/>
							</div>
							<span className="w-16 shrink-0 text-right text-[11px] font-bold tabular-nums">
								{formatDecimalPlaces(linha.quantidade, 0, 0)}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
