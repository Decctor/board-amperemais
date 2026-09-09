"use client";

import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useExpiringCashback } from "@/lib/queries/dashboard-hub";
import { BadgePercent } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

const WINDOW_DAYS = 30;

/** Dinheiro do cliente prestes a virar pó: quem tem mais a perder é quem mais vale um contato. */
export function CashbackExpiringWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useExpiringCashback({ days: WINDOW_DAYS });
	const total = data?.total ?? { valor: 0, clientes: 0 };

	return (
		<HubWidget>
			<HubWidget.Header
				icon={<BadgePercent />}
				title="Cashback expirando"
				hint={total.valor > 0 ? formatToMoney(total.valor) : `${WINDOW_DAYS} dias`}
				href={`${appRoutes.growth.newCampaign()}?category=EVENT&stage=trigger`}
				hrefLabel="Campanha"
			/>
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : !data || data.clientes.length === 0 ? (
				<HubWidget.Empty message={`Nenhum saldo expira nos próximos ${WINDOW_DAYS} dias.`} />
			) : (
				<>
					<HubWidget.List>
						{data.clientes.map((client) => (
							<HubWidget.Item
								key={client.clienteId}
								href={appRoutes.customers.details(client.clienteId)}
								primary={client.nome}
								secondary={`expira em ${formatDateAsLocale(client.expiraEm)}`}
								trailing={formatToMoney(client.valor)}
							/>
						))}
					</HubWidget.List>
					<HubWidget.Details>
						<HubWidget.Detail label={`Clientes com saldo expirando em ${WINDOW_DAYS} dias`} value={total.clientes} />
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
