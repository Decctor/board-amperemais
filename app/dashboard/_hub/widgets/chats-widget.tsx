"use client";

import { formatDecimalPlaces } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useChatsStatsOverview } from "@/lib/queries/chats-stats";
import { MessageCircle } from "lucide-react";
import { useMemo } from "react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";
import { resolveTodayRange, useDayKey } from "../use-day-key";

/** Atendimentos: a fila agora (retrato) e quem ainda não teve resposta na semana. */
export function ChatsWidget(_props: TDashboardWidgetProps) {
	const dayKey = useDayKey();
	const period = useMemo(() => {
		const { after, before } = resolveTodayRange(dayKey);
		return { startDate: after.subtract(6, "day").toDate(), endDate: before.toDate() };
	}, [dayKey]);
	const { data, isPending, isError, error } = useChatsStatsOverview({ period });
	const backlog = data?.backlog;
	const abertos = backlog?.abertosAgora ?? 0;
	const semResposta = data?.volume.semPrimeiraResposta ?? 0;
	const expirando = backlog?.janelaExpirando ?? 0;

	return (
		<HubWidget href={appRoutes.channels.whatsapp()} attention={semResposta > 0 || expirando > 0}>
			<HubWidget.Header icon={<MessageCircle />} title="Atendimentos" hint="Agora" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : abertos === 0 ? (
				<HubWidget.Empty message="Nenhuma conversa aberta no momento." />
			) : (
				<>
					<HubWidget.Value label={abertos === 1 ? "conversa aberta" : "conversas abertas"}>{formatDecimalPlaces(abertos)}</HubWidget.Value>
					<HubWidget.Details>
						{backlog && backlog.naFila > 0 ? <HubWidget.Detail label="Na fila, sem atendente" value={backlog.naFila} /> : null}
						{semResposta > 0 ? <HubWidget.Detail label="Sem primeira resposta (7 dias)" value={semResposta} tone="destructive" /> : null}
						{expirando > 0 ? <HubWidget.Detail label="Janela de 24h expirando" value={expirando} tone="destructive" /> : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
