"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useFinancesOverallStats } from "@/lib/queries/finances";
import { Wallet } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

export function FinanceDueWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useFinancesOverallStats({ initialParams: {} });
	const today = data?.totalPendingTransactionsForToday;
	const overdue = data?.totalPendingTransactionsOverdue;
	const overdueTotal = (overdue?.inflow ?? 0) + (overdue?.outflow ?? 0);
	const todayTotal = (today?.inflow ?? 0) + (today?.outflow ?? 0);

	return (
		<HubWidget href={appRoutes.finance.reports.receivablesPayables()} attention={overdueTotal > 0}>
			<HubWidget.Header icon={<Wallet />} title="Financeiro" hint="Vencimentos" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : todayTotal === 0 && overdueTotal === 0 ? (
				<HubWidget.Empty message="Nada vence hoje e nada está atrasado." />
			) : (
				<>
					<HubWidget.Value label={overdueTotal > 0 ? "em atraso" : "vencendo hoje"}>
						{formatToMoney(overdueTotal > 0 ? overdueTotal : todayTotal)}
					</HubWidget.Value>
					<HubWidget.Details>
						<HubWidget.Detail label="A receber hoje" value={formatToMoney(today?.inflow ?? 0)} tone="success" />
						<HubWidget.Detail label="A pagar hoje" value={formatToMoney(today?.outflow ?? 0)} />
						{overdueTotal > 0 ? (
							<HubWidget.Detail
								label="Atrasados (receber · pagar)"
								value={`${formatToMoney(overdue?.inflow ?? 0)} · ${formatToMoney(overdue?.outflow ?? 0)}`}
								tone="destructive"
							/>
						) : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
