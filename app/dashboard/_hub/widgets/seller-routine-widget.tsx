"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useClientPortfolio, useClientPortfolioAgendaDay, useClientPortfolioStats } from "@/lib/queries/client-portfolios";
import { UserRound } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";
import { useDayKey } from "../use-day-key";

const LIST_LIMIT = 5;

/**
 * Rotina do vendedor vinculado ao membro: retornos marcados para hoje (os atrasados vêm junto) e,
 * no espaço que sobrar, os clientes da carteira com maior débito de comunicação — a fila do hub.
 */
export function SellerRoutineWidget({ sellerId }: TDashboardWidgetProps) {
	const dayKey = useDayKey();
	const stats = useClientPortfolioStats({ vendedorId: sellerId });
	const agenda = useClientPortfolioAgendaDay({ vendedorId: sellerId, dateKey: dayKey });
	const queue = useClientPortfolio({ vendedorId: sellerId });

	const followUps = agenda.data ?? [];
	const fila = queue.data?.fila ?? [];
	const remainingSlots = Math.max(0, LIST_LIMIT - followUps.length);
	const overdue = followUps.filter((item) => item.atrasado).length;
	const vendasHoje = stats.data?.vendasHoje;
	const metaDia = stats.data?.metaDia ?? 0;
	const hint = vendasHoje ? `${formatToMoney(vendasHoje.valor)}${metaDia > 0 ? ` de ${formatToMoney(metaDia)}` : ""} hoje` : undefined;

	const isPending = agenda.isPending || queue.isPending;
	const isError = agenda.isError || queue.isError;

	return (
		<HubWidget attention={overdue > 0}>
			<HubWidget.Header icon={<UserRound />} title="Minha rotina" hint={hint} href={appRoutes.customers.portfolios()} hrefLabel="Minha carteira" />
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={agenda.error ?? queue.error} />
			) : followUps.length === 0 && fila.length === 0 ? (
				<HubWidget.Empty message="Nenhum retorno marcado e ninguém em débito de contato." />
			) : (
				<>
					<HubWidget.List>
						{followUps.slice(0, LIST_LIMIT).map((followUp) => (
							<HubWidget.Item
								key={followUp.id}
								href={followUp.cliente ? appRoutes.customers.details(followUp.cliente.id) : undefined}
								primary={followUp.cliente?.nome ?? followUp.titulo}
								secondary={followUp.cliente ? followUp.titulo : (followUp.descricao ?? "Retorno planejado")}
								trailing={followUp.atrasado ? "atrasado" : "hoje"}
								tone={followUp.atrasado ? "destructive" : "default"}
							/>
						))}
						{fila.slice(0, remainingSlots).map((entry) => (
							<HubWidget.Item
								key={entry.cliente.id}
								href={appRoutes.customers.details(entry.cliente.id)}
								primary={entry.cliente.nome}
								secondary={entry.motivos[0]?.texto ?? entry.cliente.segmento ?? "Em débito de contato"}
								trailing={entry.diasSemContato !== null ? `${entry.diasSemContato} d sem contato` : undefined}
							/>
						))}
					</HubWidget.List>
					<HubWidget.Details>
						{queue.data && queue.data.totalEmDebito > 0 ? (
							<HubWidget.Detail label="Clientes em débito de contato" value={queue.data.totalEmDebito} />
						) : null}
						{stats.data ? (
							<HubWidget.Detail
								label="Abordagens registradas hoje"
								value={stats.data.abordagensHoje}
								tone={stats.data.abordagensHoje > 0 ? "success" : "default"}
							/>
						) : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
