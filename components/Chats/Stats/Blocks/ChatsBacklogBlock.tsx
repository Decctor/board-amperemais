"use client";

import { formatDateAsLocale, formatDecimalPlaces, formatDurationFromSeconds } from "@/lib/formatting";
import type { TChatsStatsOverview } from "@/lib/queries/chats-stats";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, Inbox, MessageCircleWarning } from "lucide-react";
import { CHAT_STATS_MIN_SAMPLE_FOR_P90, CHAT_STATS_PRIORITY_LABEL, CHAT_STATS_STATUS_LABEL } from "../config";

type ChatsBacklogBlockProps = {
	overview: TChatsStatsOverview | undefined;
	isLoading: boolean;
};

function MetricTile({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: "alerta" }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-border p-3">
			<span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
				{icon}
				{label}
			</span>
			<span className={cn("text-xl font-bold tracking-tight tabular-nums", tone === "alerta" && "text-destructive")}>{value}</span>
			{hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
		</div>
	);
}

/**
 * Retrato da fila **agora**, não do período filtrado.
 *
 * Cada número aqui responde "como está a operação neste momento" — por isso o bloco traz a
 * marcação de acumulado e ignora o seletor de datas do topo. "23 atendimentos abertos" com
 * um filtro de mês passado seria simplesmente falso.
 */
export function ChatsBacklogBlock({ overview, isLoading }: ChatsBacklogBlockProps) {
	if (isLoading) return <div className="h-[260px] w-full animate-pulse rounded-2xl border border-border bg-muted/40" />;

	const backlog = overview?.backlog;
	const prioridades = (overview?.distribuicoes.prioridade ?? []).filter((item) => item.quantidade > 0);
	const totalPorStatus = (backlog?.porStatus ?? []).reduce((soma, item) => soma + item.quantidade, 0);
	const idadeConfiavel = (backlog?.idadeFila.amostra ?? 0) >= CHAT_STATS_MIN_SAMPLE_FOR_P90;

	return (
		<div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-col">
					<h2 className="text-sm font-bold tracking-tight">FILA AGORA</h2>
					<p className="text-xs text-muted-foreground">Retrato do momento — independe do período selecionado.</p>
				</div>
				<span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
					Acumulado
				</span>
			</div>

			<div className="flex flex-col gap-2 sm:flex-row">
				<MetricTile
					icon={<Inbox className="h-3.5 w-3.5" />}
					label="Em aberto"
					value={formatDecimalPlaces(backlog?.abertosAgora ?? 0, 0, 0)}
					hint={`${formatDecimalPlaces(backlog?.naFila ?? 0, 0, 0)} sem responsável`}
				/>
				<MetricTile
					icon={<MessageCircleWarning className="h-3.5 w-3.5" />}
					label="Aguardando resposta"
					value={formatDecimalPlaces(backlog?.aguardandoResposta ?? 0, 0, 0)}
					hint="Cliente falou por último"
					tone={(backlog?.aguardandoResposta ?? 0) > 0 ? "alerta" : undefined}
				/>
				<MetricTile
					icon={<Clock className="h-3.5 w-3.5" />}
					label="Idade da fila"
					value={formatDurationFromSeconds(backlog?.idadeFila.mediana ?? null)}
					hint={
						idadeConfiavel && backlog?.idadeFila.p90 !== null
							? `p90: ${formatDurationFromSeconds(backlog?.idadeFila.p90)} · mais antigo em ${formatDateAsLocale(backlog?.maisAntigoData)}`
							: backlog?.maisAntigoData
								? `Mais antigo em ${formatDateAsLocale(backlog.maisAntigoData)}`
								: undefined
					}
				/>
				{/* Janela expirada é o único alerta com consequência comercial direta: fora dela
				    só sai template aprovado, e reabrir depende do cliente responder. */}
				<MetricTile
					icon={<AlertTriangle className="h-3.5 w-3.5" />}
					label="Janela em risco"
					value={formatDecimalPlaces((backlog?.janelaExpirando ?? 0) + (backlog?.janelaExpirada ?? 0), 0, 0)}
					hint={`${formatDecimalPlaces(backlog?.janelaExpirada ?? 0, 0, 0)} já expiradas`}
					tone={(backlog?.janelaExpirada ?? 0) > 0 ? "alerta" : undefined}
				/>
			</div>

			<div className="flex flex-col gap-3 lg:flex-row">
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Por estado</h3>
					{totalPorStatus === 0 ? (
						<p className="text-xs text-muted-foreground">Nenhum atendimento aberto.</p>
					) : (
						(backlog?.porStatus ?? []).map((item) => (
							<div key={item.status} className="flex items-center gap-2">
								<span className="w-32 shrink-0 truncate text-[11px] text-muted-foreground">{CHAT_STATS_STATUS_LABEL[item.status]}</span>
								<div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
									<div className="h-full rounded-full bg-primary" style={{ width: `${(item.quantidade / totalPorStatus) * 100}%` }} />
								</div>
								<span className="w-10 shrink-0 text-right text-[11px] font-bold tabular-nums">{item.quantidade}</span>
							</div>
						))
					)}
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Prioridade (abertos no período)</h3>
					{prioridades.length === 0 ? (
						<p className="text-xs text-muted-foreground">Nenhuma prioridade registrada.</p>
					) : (
						prioridades.map((item) => (
							<div key={item.prioridade ?? "SEM"} className="flex items-center justify-between gap-2 text-xs">
								<span className="text-muted-foreground">{item.prioridade ? CHAT_STATS_PRIORITY_LABEL[item.prioridade] : "Sem prioridade"}</span>
								<span className="font-bold tabular-nums">{item.quantidade}</span>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
