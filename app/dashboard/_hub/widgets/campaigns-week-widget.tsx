"use client";

import { formatDecimalPlaces } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useCampaignFunnel } from "@/lib/queries/campaigns";
import { Megaphone } from "lucide-react";
import { useMemo } from "react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";
import { resolveTodayRange, useDayKey } from "../use-day-key";

export function CampaignsWeekWidget(_props: TDashboardWidgetProps) {
	const dayKey = useDayKey();
	const input = useMemo(() => {
		const { after, before } = resolveTodayRange(dayKey);
		return { startDate: after.subtract(6, "day").toDate(), endDate: before.toDate() };
	}, [dayKey]);
	const { data, isPending, isError, error } = useCampaignFunnel(input);
	const enviados = data?.enviados ?? 0;

	return (
		<HubWidget href={`${appRoutes.growth.campaigns()}?view=stats`}>
			<HubWidget.Header icon={<Megaphone />} title="Campanhas" hint="7 dias" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : enviados === 0 ? (
				<HubWidget.Empty message="Nenhuma mensagem enviada nos últimos 7 dias." />
			) : (
				<>
					<HubWidget.Value label="mensagens enviadas">{formatDecimalPlaces(enviados)}</HubWidget.Value>
					<HubWidget.Details>
						<HubWidget.Detail label="Lidas" value={`${formatDecimalPlaces(data?.lidos ?? 0)} · ${formatDecimalPlaces(data?.taxaLeitura ?? 0)}%`} />
						<HubWidget.Detail
							label="Conversões"
							value={formatDecimalPlaces(data?.convertidos ?? 0)}
							tone={(data?.convertidos ?? 0) > 0 ? "success" : "default"}
						/>
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
