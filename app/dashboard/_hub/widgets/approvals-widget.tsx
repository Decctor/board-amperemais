"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useActionApprovals } from "@/lib/queries/action-approvals";
import { ShieldCheck } from "lucide-react";
import { formatTimeAgo } from "../format";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

const LIST_LIMIT = 5;

export function ApprovalsWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useActionApprovals({ status: "PENDENTE" });
	const total = data?.length ?? 0;

	return (
		<HubWidget attention={total > 0}>
			<HubWidget.Header
				icon={<ShieldCheck />}
				title="Aprovações"
				hint={total > 0 ? `${total} pendente${total === 1 ? "" : "s"}` : undefined}
				href={appRoutes.approvals()}
			/>
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : total === 0 ? (
				<HubWidget.Empty message="Nenhuma solicitação aguardando você." />
			) : (
				<HubWidget.List>
					{data.slice(0, LIST_LIMIT).map((request) => (
						<HubWidget.Item
							key={request.id}
							primary={request.resumo.titulo}
							secondary={`${request.solicitante?.nome ?? "Solicitante"} · ${formatTimeAgo(request.dataInsercao)}`}
							trailing={request.resumo.valorPrincipal !== null ? formatToMoney(request.resumo.valorPrincipal) : undefined}
						/>
					))}
				</HubWidget.List>
			)}
		</HubWidget>
	);
}
