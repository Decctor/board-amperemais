"use client";

import { appRoutes } from "@/lib/navigation/routes";
import { useActionApprovals } from "@/lib/queries/action-approvals";
import { ShieldCheck } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

export function ApprovalsWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useActionApprovals({ status: "PENDENTE" });
	const total = data?.length ?? 0;

	return (
		<HubWidget href={appRoutes.approvals()} attention={total > 0}>
			<HubWidget.Header icon={<ShieldCheck />} title="Aprovações" hint="Pendentes" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : total === 0 ? (
				<HubWidget.Empty message="Nenhuma solicitação aguardando você." />
			) : (
				<HubWidget.Value label={total === 1 ? "solicitação aguardando decisão" : "solicitações aguardando decisão"}>{total}</HubWidget.Value>
			)}
		</HubWidget>
	);
}
