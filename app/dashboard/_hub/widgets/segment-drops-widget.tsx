"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useRecentSegmentChanges } from "@/lib/queries/dashboard-hub";
import { RFMLabels } from "@/utils/rfm";
import { TrendingDown } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

const WINDOW_DAYS = 7;

function segmentLabel(segmento: string | null) {
	if (!segmento) return "Sem segmento";
	const label = RFMLabels.find((entry) => entry.text === segmento);
	return label ? label.text.charAt(0) + label.text.slice(1).toLowerCase() : segmento;
}

/** Clientes que acabaram de cair num segmento de risco: o melhor momento de agir é agora. */
export function SegmentDropsWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useRecentSegmentChanges({ days: WINDOW_DAYS });
	const total = data?.total ?? 0;

	return (
		<HubWidget attention={total > 0}>
			<HubWidget.Header
				icon={<TrendingDown />}
				title="Clientes esfriando"
				hint={total > 0 ? `${total} na semana` : `${WINDOW_DAYS} dias`}
				href={appRoutes.customers.segments()}
				hrefLabel="Matriz RFM"
			/>
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : !data || data.clientes.length === 0 ? (
				<HubWidget.Empty message="Nenhum cliente esfriou nesta semana." />
			) : (
				<>
					<HubWidget.List>
						{data.clientes.map((client) => (
							<HubWidget.Item
								key={client.id}
								href={appRoutes.customers.details(client.id)}
								primary={client.nome}
								secondary={segmentLabel(client.segmento)}
								trailing={formatToMoney(client.valorTotalCompras ?? 0)}
							/>
						))}
					</HubWidget.List>
					<HubWidget.Details>
						{data.porSegmento.map((row) => (
							<HubWidget.Detail key={row.segmento} label={segmentLabel(row.segmento)} value={row.qtde} />
						))}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
