"use client";

import { formatDecimalPlaces } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useCampaignFunnel } from "@/lib/queries/campaigns";
import { useCampaignsHealth } from "@/lib/queries/dashboard-hub";
import { cn } from "@/lib/utils";
import { Megaphone } from "lucide-react";
import { useMemo } from "react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";
import { resolveTodayRange, useDayKey } from "../use-day-key";

/** Campanhas: o que saiu na semana, o que falhou hoje e quanto da quota semanal já foi consumido. */
export function CampaignsWidget(_props: TDashboardWidgetProps) {
	const dayKey = useDayKey();
	const range = useMemo(() => {
		const { after, before } = resolveTodayRange(dayKey);
		return { dayStart: after.toDate(), startDate: after.subtract(6, "day").toDate(), endDate: before.toDate() };
	}, [dayKey]);
	const funnel = useCampaignFunnel({ startDate: range.startDate, endDate: range.endDate });
	const health = useCampaignsHealth({ dayStart: range.dayStart });

	const enviados = funnel.data?.enviados ?? 0;
	const falhas = health.data?.hoje.falhas ?? 0;
	const bloqueadas = health.data?.hoje.bloqueadas ?? 0;
	const quota = health.data?.quotaSemanal;
	const quotaRatio = quota?.limite ? Math.min(quota.usados / quota.limite, 1) : null;

	return (
		<HubWidget href={`${appRoutes.growth.campaigns()}?view=stats`} attention={falhas > 0}>
			<HubWidget.Header icon={<Megaphone />} title="Campanhas" hint="7 dias" />
			{funnel.isPending || health.isPending ? (
				<HubWidget.Loading />
			) : funnel.isError || health.isError ? (
				<HubWidget.Error error={funnel.error ?? health.error} />
			) : (
				<>
					{falhas > 0 ? (
						<HubWidget.Value label={`envio${falhas === 1 ? "" : "s"} com falha hoje`}>{formatDecimalPlaces(falhas)}</HubWidget.Value>
					) : enviados === 0 ? (
						<HubWidget.Empty message="Nenhuma mensagem enviada nos últimos 7 dias." />
					) : (
						<HubWidget.Value label="mensagens enviadas na semana">{formatDecimalPlaces(enviados)}</HubWidget.Value>
					)}
					<HubWidget.Details>
						{falhas > 0 ? <HubWidget.Detail label="Enviadas na semana" value={formatDecimalPlaces(enviados)} /> : null}
						<HubWidget.Detail
							label="Lidas · conversões"
							value={`${formatDecimalPlaces(funnel.data?.lidos ?? 0)} · ${formatDecimalPlaces(funnel.data?.convertidos ?? 0)}`}
						/>
						{bloqueadas > 0 ? <HubWidget.Detail label="Bloqueadas por limite hoje" value={formatDecimalPlaces(bloqueadas)} tone="destructive" /> : null}
						{quota?.limite ? (
							<div className="flex flex-col gap-1 pt-1">
								<div className="flex items-center justify-between text-xs">
									<span className="text-muted-foreground">Quota semanal</span>
									<span className="font-semibold tabular-nums">
										{formatDecimalPlaces(quota.usados)} / {formatDecimalPlaces(quota.limite)}
									</span>
								</div>
								{/* Medidor: o preenchido carrega a severidade; a trilha é um passo mais claro da mesma cor. */}
								<div
									className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
									role="meter"
									aria-valuemin={0}
									aria-valuemax={quota.limite}
									aria-valuenow={quota.usados}
								>
									<div
										className={cn("h-full rounded-full", quotaRatio !== null && quotaRatio >= 0.9 ? "bg-destructive" : "bg-primary")}
										style={{ width: `${(quotaRatio ?? 0) * 100}%` }}
									/>
								</div>
							</div>
						) : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
