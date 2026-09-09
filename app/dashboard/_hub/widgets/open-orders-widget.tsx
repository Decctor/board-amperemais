"use client";

import { appRoutes } from "@/lib/navigation/routes";
import { useSalesFulfillment } from "@/lib/queries/sales-fulfillment";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { ClipboardList } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

// Etapas em que o pedido ainda depende da loja. Entregue/cancelado saem da conta.
const IN_PROGRESS_STATUSES: ReadonlySet<TSaleAttendanceStatusEnum | null> = new Set(["NAO_INICIADO", "EM_PREPARO", "PRONTO", "EM_ENTREGA"]);

export function OpenOrdersWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useSalesFulfillment();
	const inProgress = data?.cards.filter((card) => IN_PROGRESS_STATUSES.has(card.statusAtendimento)).length ?? 0;
	const pendingConfirmation = data?.pendingConfirmation.length ?? 0;
	const pendingDisputes = data?.pendingDisputes.length ?? 0;
	const needsAction = pendingConfirmation + pendingDisputes;

	return (
		<HubWidget href={appRoutes.sales.orders()} attention={needsAction > 0}>
			<HubWidget.Header icon={<ClipboardList />} title="Pedidos" hint="Em andamento" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : inProgress === 0 && needsAction === 0 ? (
				<HubWidget.Empty message="Nenhum pedido em aberto." />
			) : (
				<>
					<HubWidget.Value label={inProgress === 1 ? "pedido em andamento" : "pedidos em andamento"}>{inProgress}</HubWidget.Value>
					{needsAction > 0 ? (
						<HubWidget.Details>
							{pendingConfirmation > 0 ? <HubWidget.Detail label="Aguardando confirmação" value={pendingConfirmation} tone="destructive" /> : null}
							{pendingDisputes > 0 ? <HubWidget.Detail label="Disputas de cancelamento" value={pendingDisputes} tone="destructive" /> : null}
						</HubWidget.Details>
					) : null}
				</>
			)}
		</HubWidget>
	);
}
