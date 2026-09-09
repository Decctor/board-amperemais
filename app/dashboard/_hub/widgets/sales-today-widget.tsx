"use client";

import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useOverallSalesStats } from "@/lib/queries/stats/overall";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import { BadgeDollarSign } from "lucide-react";
import { useMemo } from "react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";
import { resolveTodayRange, useDayKey } from "../use-day-key";

export function SalesTodayWidget({ scopeSellersIds, canViewSensitive }: TDashboardWidgetProps) {
	const dayKey = useDayKey();
	const params = useMemo<TSaleStatsGeneralQueryParams>(() => {
		const { after, before } = resolveTodayRange(dayKey);
		return {
			period: { after: after.toISOString(), before: before.toISOString() },
			total: {},
			integrationsIds: [],
			sellersIds: scopeSellersIds ?? [],
			clientRFMTitles: [],
			excludedSalesIds: [],
		};
	}, [dayKey, scopeSellersIds]);
	const { data, isPending, isError, error } = useOverallSalesStats(params);
	const faturamento = data?.faturamento.atual ?? 0;
	const qtdeVendas = data?.qtdeVendas.atual ?? 0;

	return (
		<HubWidget href={appRoutes.sales.results()}>
			<HubWidget.Header icon={<BadgeDollarSign />} title="Vendas" hint="Hoje" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : qtdeVendas === 0 ? (
				<HubWidget.Empty message="Nenhuma venda registrada hoje ainda." />
			) : (
				<>
					<HubWidget.Value label={qtdeVendas === 1 ? "1 venda" : `${formatDecimalPlaces(qtdeVendas)} vendas`}>
						{formatToMoney(faturamento)}
					</HubWidget.Value>
					<HubWidget.Details>
						<HubWidget.Detail label="Ticket médio" value={formatToMoney(data?.ticketMedio.atual ?? 0)} />
						{canViewSensitive ? <HubWidget.Detail label="Margem bruta" value={formatToMoney(data?.margemBruta.atual ?? 0)} /> : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
