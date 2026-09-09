"use client";

import { appRoutes } from "@/lib/navigation/routes";
import { useClientBirthdays } from "@/lib/queries/dashboard-hub";
import { Cake, MessageCircle } from "lucide-react";
import { whatsappLink } from "../format";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

const WINDOW_DAYS = 7;

function inDaysLabel(emDias: number) {
	if (emDias === 0) return "hoje";
	if (emDias === 1) return "amanhã";
	return `em ${emDias} dias`;
}

export function BirthdaysWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useClientBirthdays({ days: WINDOW_DAYS });
	const hoje = data?.hoje ?? 0;

	return (
		<HubWidget attention={hoje > 0}>
			<HubWidget.Header
				icon={<Cake />}
				title="Aniversariantes"
				hint={hoje > 0 ? `${hoje} hoje` : `${WINDOW_DAYS} dias`}
				href={appRoutes.customers.root()}
				hrefLabel="Clientes"
			/>
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : !data || data.clientes.length === 0 ? (
				<HubWidget.Empty message="Nenhum aniversário nesta semana." />
			) : (
				<HubWidget.List>
					{data.clientes.map((client) => {
						const link = whatsappLink(client.telefone);
						return (
							<HubWidget.Item
								key={client.id}
								href={appRoutes.customers.details(client.id)}
								primary={client.nome}
								secondary={client.telefone || "Sem telefone"}
								trailing={
									<span className="flex items-center gap-1.5">
										{inDaysLabel(client.emDias)}
										{link ? <MessageCircle role="img" aria-label="Tem WhatsApp" className="size-3.5 text-success" /> : null}
									</span>
								}
								tone={client.emDias === 0 ? "success" : "default"}
							/>
						);
					})}
				</HubWidget.List>
			)}
		</HubWidget>
	);
}
