"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import type { TMetaAdsLibraryAd } from "@/lib/integrations/meta/ads/types";
import { useMetaAdsAdDetail } from "@/lib/queries/meta-ads";
import { cn } from "@/lib/utils";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { getMetaAdEffectiveStatusConfig } from "./meta-ad-status";

const SPEND_CHART_CONFIG = { spend: { label: "Investimento", color: "#ffb900" } } as const;

function formatInt(value: number) {
	return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

type MetaAdDetailModalProps = {
	ad: TMetaAdsLibraryAd;
	integrationId: string;
	since: string;
	until: string;
	closeModal: () => void;
};

export function MetaAdDetailModal({ ad, integrationId, since, until, closeModal }: MetaAdDetailModalProps) {
	const { data: detail, isLoading, isError, error } = useMetaAdsAdDetail({ adId: ad.id, integrationId, since, until });
	const status = getMetaAdEffectiveStatusConfig(ad.effectiveStatus);

	const daily = (detail?.daily ?? []).map((point) => ({ date: point.date.slice(5), spend: point.spend }));

	return (
		<Dialog open onOpenChange={(open) => !open && closeModal()}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-left text-base">{ad.name}</DialogTitle>
					<DialogDescription className="flex flex-wrap items-center gap-2 text-left">
						{ad.campaignName ? <span>{ad.campaignName}</span> : null}
						<span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", status.className)}>{status.label}</span>
					</DialogDescription>
				</DialogHeader>

				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

				{detail ? (
					<div className="flex w-full flex-col gap-4">
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							<Metric label="Investimento" value={formatToMoney(detail.summary.spend)} />
							<Metric label="Compras" value={formatInt(detail.summary.purchases)} />
							<Metric label="Receita" value={formatToMoney(detail.summary.purchaseValue)} />
							<Metric label="ROAS" value={detail.summary.purchaseRoas != null ? `${detail.summary.purchaseRoas.toFixed(2)}x` : "—"} />
							<Metric label="Impressões" value={formatInt(detail.summary.impressions)} />
							<Metric label="Cliques" value={formatInt(detail.summary.clicks)} />
							<Metric label="CTR" value={detail.summary.ctr != null ? `${detail.summary.ctr.toFixed(2)}%` : "—"} />
							<Metric label="Leads" value={formatInt(detail.summary.leads)} />
						</div>

						{daily.length > 0 ? (
							<div className="flex h-[220px] w-full items-center justify-center">
								<ChartContainer config={SPEND_CHART_CONFIG} className="aspect-auto h-[220px] w-full">
									<ComposedChart data={daily} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
										<defs>
											<linearGradient id="adSpendGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="10%" stopColor="var(--color-spend)" stopOpacity={0.9} />
												<stop offset="90%" stopColor="var(--color-spend)" stopOpacity={0.1} />
											</linearGradient>
										</defs>
										<CartesianGrid vertical={false} />
										<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
										<YAxis orientation="left" tickFormatter={(value) => formatToMoney(Number(value))} stroke="var(--color-spend)" width={70} />
										<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
										<Area dataKey="spend" type="monotone" fill="url(#adSpendGradient)" stroke="var(--color-spend)" />
									</ComposedChart>
								</ChartContainer>
							</div>
						) : null}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col rounded-lg border border-border bg-muted/40 p-2">
			<span className="text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
			<span className="text-sm font-bold tabular-nums text-foreground">{value}</span>
		</div>
	);
}
