"use client";

import StatUnitCard from "@/components/Stats/StatUnitCard";
import { formatDecimalPlaces, formatDurationFromSeconds } from "@/lib/formatting";
import type { TChatsStatsOverview } from "@/lib/queries/chats-stats";
import { AlarmClock, CheckCircle2, Inbox, MessageSquareOff, Scale, Timer } from "lucide-react";
import { CHAT_STATS_MIN_SAMPLE_FOR_P90 } from "../config";

type ChatsKpiCardsBlockProps = {
	overview: TChatsStatsOverview | undefined;
	isLoading: boolean;
};

/** Rodapé de card de tempo: o p90 só aparece quando a amostra o sustenta. */
function percentileFooter(stats: { p90: number | null; amostra: number } | undefined) {
	if (!stats || stats.amostra < CHAT_STATS_MIN_SAMPLE_FOR_P90 || stats.p90 === null) {
		return stats?.amostra ? `${stats.amostra} atendimento(s) na amostra` : undefined;
	}
	return `p90: ${formatDurationFromSeconds(stats.p90)} · ${stats.amostra} na amostra`;
}

export function ChatsKpiCardsBlock({ overview, isLoading }: ChatsKpiCardsBlockProps) {
	if (isLoading) {
		return (
			<div className="flex w-full flex-wrap gap-3">
				{[...Array(6)].map((_, index) => (
					<div key={index} className="h-[88px] min-w-[140px] flex-1 animate-pulse rounded-xl border bg-muted/40" />
				))}
			</div>
		);
	}

	const volume = overview?.volume;
	const tempos = overview?.tempos;
	const sla = overview?.sla;

	return (
		<div className="flex w-full flex-col items-stretch gap-2 lg:flex-row">
			<StatUnitCard
				title="ATENDIMENTOS ABERTOS"
				current={{ value: volume?.abertos ?? 0, format: (n) => formatDecimalPlaces(n, 0, 0) }}
				previous={overview?.comparacao ? { value: overview.comparacao.abertos, format: (n) => formatDecimalPlaces(n, 0, 0) } : undefined}
				previousLabel="NO PERÍODO ANTERIOR"
				icon={<Inbox className="h-4 w-4" />}
				className="w-full lg:w-1/6"
			/>
			<StatUnitCard
				title="ENCERRADOS"
				current={{ value: volume?.encerrados ?? 0, format: (n) => formatDecimalPlaces(n, 0, 0) }}
				previous={overview?.comparacao ? { value: overview.comparacao.encerrados, format: (n) => formatDecimalPlaces(n, 0, 0) } : undefined}
				previousLabel="NO PERÍODO ANTERIOR"
				icon={<CheckCircle2 className="h-4 w-4" />}
				className="w-full lg:w-1/6"
			/>
			{/* Saldo positivo = a fila cresceu. É o único KPI em que subir é ruim. */}
			<StatUnitCard
				title="SALDO DA FILA"
				subtitle={(volume?.saldoBacklog ?? 0) > 0 ? "Abriram mais do que fecharam" : "Fecharam mais do que abriram"}
				current={{ value: volume?.saldoBacklog ?? 0, format: (n) => `${n > 0 ? "+" : ""}${formatDecimalPlaces(n, 0, 0)}` }}
				lowerIsBetter
				icon={<Scale className="h-4 w-4" />}
				className="w-full lg:w-1/6"
			/>
			<StatUnitCard
				title="1ª RESPOSTA (MEDIANA)"
				current={{ value: tempos?.primeiraResposta.mediana ?? 0, format: (n) => formatDurationFromSeconds(n) }}
				previous={
					overview?.comparacao?.tempos.primeiraResposta.mediana != null
						? { value: overview.comparacao.tempos.primeiraResposta.mediana, format: (n) => formatDurationFromSeconds(n) }
						: undefined
				}
				previousLabel="NO PERÍODO ANTERIOR"
				lowerIsBetter
				footer={percentileFooter(tempos?.primeiraResposta)}
				icon={<Timer className="h-4 w-4" />}
				className="w-full lg:w-1/6"
			/>
			<StatUnitCard
				title={`DENTRO DE ${sla?.metaMinutos ?? 15} MIN`}
				subtitle="Sobre os que foram respondidos"
				current={{ value: (sla?.percentualDentroDaMeta ?? 0) * 100, format: (n) => `${formatDecimalPlaces(n)}%` }}
				icon={<AlarmClock className="h-4 w-4" />}
				className="w-full lg:w-1/6"
			/>
			{/* O número que mais dói: conversas do período que ninguém respondeu, nunca. */}
			<StatUnitCard
				title="SEM 1ª RESPOSTA"
				current={{ value: volume?.semPrimeiraResposta ?? 0, format: (n) => formatDecimalPlaces(n, 0, 0) }}
				previous={
					overview?.comparacao ? { value: overview.comparacao.semPrimeiraResposta, format: (n) => formatDecimalPlaces(n, 0, 0) } : undefined
				}
				previousLabel="NO PERÍODO ANTERIOR"
				lowerIsBetter
				icon={<MessageSquareOff className="h-4 w-4" />}
				className="w-full lg:w-1/6"
			/>
		</div>
	);
}
