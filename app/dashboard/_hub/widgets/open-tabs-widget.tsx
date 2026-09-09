"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useTabs } from "@/lib/queries/tabs";
import { UtensilsCrossed } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

export function OpenTabsWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useTabs({ initialParams: { status: ["ABERTA"] } });
	const total = data?.length ?? 0;
	const valorTotal = data?.reduce((acc, tab) => acc + (tab.valorTotal ?? 0), 0) ?? 0;

	return (
		<HubWidget href={appRoutes.sales.serviceAccounts()}>
			<HubWidget.Header icon={<UtensilsCrossed />} title="Contas abertas" hint="Agora" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : total === 0 ? (
				<HubWidget.Empty message="Nenhuma conta aberta no momento." />
			) : (
				<>
					<HubWidget.Value label={total === 1 ? "conta em atendimento" : "contas em atendimento"}>{total}</HubWidget.Value>
					<HubWidget.Details>
						<HubWidget.Detail label="Consumo acumulado" value={formatToMoney(valorTotal)} />
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
