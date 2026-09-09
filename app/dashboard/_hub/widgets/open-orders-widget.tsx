"use client";

import { IFOOD_CONFIRMATION_SLA_MINUTES } from "@/app/dashboard/sales/_components/fulfillment/pending-confirmation";
import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useSalesFulfillment } from "@/lib/queries/sales-fulfillment";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import dayjs from "dayjs";
import { ClipboardList } from "lucide-react";
import { formatTimeAgo, minutesUntil } from "../format";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

const LIST_LIMIT = 5;

// Etapas em que o pedido ainda depende da loja. Entregue/cancelado saem da conta.
const IN_PROGRESS_LABELS: Partial<Record<TSaleAttendanceStatusEnum, string>> = {
	NAO_INICIADO: "Não iniciado",
	EM_PREPARO: "Em preparo",
	PRONTO: "Pronto",
	EM_ENTREGA: "Em entrega",
};

export function OpenOrdersWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useSalesFulfillment();
	const inProgress = data?.cards.filter((card) => card.statusAtendimento in IN_PROGRESS_LABELS) ?? [];
	const pendingConfirmation = data?.pendingConfirmation ?? [];
	const pendingDisputes = data?.pendingDisputes.length ?? 0;
	const needsAction = pendingConfirmation.length + pendingDisputes;
	const remainingSlots = Math.max(0, LIST_LIMIT - pendingConfirmation.length);

	return (
		<HubWidget attention={needsAction > 0}>
			<HubWidget.Header
				icon={<ClipboardList />}
				title="Pedidos"
				hint={inProgress.length > 0 ? `${inProgress.length} em andamento` : undefined}
				href={appRoutes.sales.orders()}
			/>
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : inProgress.length === 0 && needsAction === 0 ? (
				<HubWidget.Empty message="Nenhum pedido em aberto." />
			) : (
				<>
					<HubWidget.List>
						{/* Primeiro o que tem prazo: pedidos de canal aguardando confirmação, SLA de 8 minutos. */}
						{pendingConfirmation.slice(0, LIST_LIMIT).map((order) => {
							const deadline = order.dataVenda ? dayjs(order.dataVenda).add(IFOOD_CONFIRMATION_SLA_MINUTES, "minute") : null;
							const minutesLeft = deadline ? minutesUntil(deadline.toDate()) : null;
							return (
								<HubWidget.Item
									key={order.vendaId}
									href={appRoutes.sales.details(order.vendaId)}
									primary={order.cliente?.nome ?? `Pedido ${order.displayId ?? order.orderId}`}
									secondary={`Aguardando confirmação · ${order.integracao?.apelido ?? order.canal} · ${formatToMoney(order.valorTotal)}`}
									trailing={minutesLeft === null ? "—" : minutesLeft < 0 ? `${Math.abs(minutesLeft)} min atrasado` : `${minutesLeft} min`}
									tone="destructive"
								/>
							);
						})}
						{inProgress.slice(0, remainingSlots).map((card) => (
							<HubWidget.Item
								key={card.id}
								href={appRoutes.sales.details(card.id)}
								primary={card.cliente?.nome ?? (card.comandaNumero ? `Comanda ${card.comandaNumero}` : `Pedido ${card.idExterno ?? card.id.slice(0, 6)}`)}
								secondary={`${IN_PROGRESS_LABELS[card.statusAtendimento]} · ${formatToMoney(card.valorTotal)}`}
								trailing={formatTimeAgo(card.dataVenda)}
							/>
						))}
					</HubWidget.List>
					{pendingDisputes > 0 ? (
						<HubWidget.Details>
							<HubWidget.Detail label="Disputas de cancelamento" value={pendingDisputes} tone="destructive" />
						</HubWidget.Details>
					) : null}
				</>
			)}
		</HubWidget>
	);
}
