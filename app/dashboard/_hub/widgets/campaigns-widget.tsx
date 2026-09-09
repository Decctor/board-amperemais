"use client";

import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useCampaignFunnel, useCampaignStatsOverall } from "@/lib/queries/campaigns";
import { useCampaignsHealth } from "@/lib/queries/dashboard-hub";
import { cn } from "@/lib/utils";
import { Megaphone } from "lucide-react";
import { useMemo } from "react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";
import { resolveTodayRange, useDayKey } from "../use-day-key";

const LIST_LIMIT = 3;

/**
 * Campanhas na semana: as que mais geraram receita, o funil resumido, o que falhou hoje e quanto da
 * quota semanal já foi consumido. Falha de envio é pendência; o resto é pulso.
 */
export function CampaignsWidget(_props: TDashboardWidgetProps) {
	const dayKey = useDayKey();
	const range = useMemo(() => {
		const { after, before } = resolveTodayRange(dayKey);
		return { dayStart: after.toDate(), startDate: after.subtract(6, "day").toDate(), endDate: before.toDate() };
	}, [dayKey]);
	const overall = useCampaignStatsOverall({ startDate: range.startDate, endDate: range.endDate });
	const funnel = useCampaignFunnel({ startDate: range.startDate, endDate: range.endDate });
	const health = useCampaignsHealth({ dayStart: range.dayStart });

	const totais = overall.data?.totais;
	// `campanhas` já vem ordenado por receita; só as que tiveram alguma interação na semana interessam.
	const topCampaigns = (overall.data?.campanhas ?? []).filter((campaign) => campaign.interacoes > 0).slice(0, LIST_LIMIT);
	const enviados = funnel.data?.enviados ?? 0;
	const falhas = health.data?.hoje.falhas ?? 0;
	const bloqueadas = health.data?.hoje.bloqueadas ?? 0;
	const quota = health.data?.quotaSemanal;
	const quotaRatio = quota?.limite ? Math.min(quota.usados / quota.limite, 1) : null;

	const isPending = overall.isPending || funnel.isPending || health.isPending;
	const isError = overall.isError || funnel.isError || health.isError;

	return (
		<HubWidget attention={falhas > 0}>
			<HubWidget.Header
				icon={<Megaphone />}
				title="Campanhas"
				hint={totais ? `${totais.campanhasAtivas} ativa${totais.campanhasAtivas === 1 ? "" : "s"} · 7 dias` : "7 dias"}
				href={`${appRoutes.growth.campaigns()}?view=stats`}
				hrefLabel="Estatísticas"
			/>
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={overall.error ?? funnel.error ?? health.error} />
			) : enviados === 0 && falhas === 0 ? (
				<HubWidget.Empty message="Nenhuma mensagem enviada nos últimos 7 dias." />
			) : (
				<>
					{topCampaigns.length > 0 ? (
						<HubWidget.List>
							{topCampaigns.map((campaign) => (
								<HubWidget.Item
									key={campaign.id}
									href={appRoutes.growth.campaign(campaign.id)}
									primary={campaign.titulo}
									secondary={`${formatDecimalPlaces(campaign.interacoes)} msg · ${formatDecimalPlaces(campaign.conversoes)} conv. · ${formatDecimalPlaces(campaign.taxaConversao)}%`}
									trailing={formatToMoney(campaign.receitaTotal)}
									tone={campaign.receitaTotal > 0 ? "success" : "default"}
								/>
							))}
						</HubWidget.List>
					) : null}
					<HubWidget.Details>
						<HubWidget.Detail
							label="Enviadas · lidas · conversões"
							value={`${formatDecimalPlaces(enviados)} · ${formatDecimalPlaces(funnel.data?.lidos ?? 0)} · ${formatDecimalPlaces(funnel.data?.convertidos ?? 0)}`}
						/>
						{totais && totais.receita > 0 ? (
							<HubWidget.Detail
								label="Receita atribuída (incremental)"
								value={`${formatToMoney(totais.receita)} (${formatToMoney(totais.receitaIncremental)})`}
								tone="success"
							/>
						) : null}
						{falhas > 0 ? <HubWidget.Detail label="Envios com falha hoje" value={formatDecimalPlaces(falhas)} tone="destructive" /> : null}
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
