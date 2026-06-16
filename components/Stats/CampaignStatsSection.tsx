"use client";
import { CampaignFunnelBlock } from "@/components/Stats/Blocks/CampaignFunnelBlock";
import { CampaignGraphBlock } from "@/components/Stats/Blocks/CampaignGraphBlock";
import { CampaignKpiCardsBlock } from "@/components/Stats/Blocks/CampaignKpiCardsBlock";
import { CampaignQualityCardsBlock } from "@/components/Stats/Blocks/CampaignQualityCardsBlock";
import { CampaignRankingBlock } from "@/components/Stats/Blocks/CampaignRankingBlock";
import { CampaignTriggerDistributionBlock } from "@/components/Stats/Blocks/CampaignTriggerDistributionBlock";
import { InteractiveFilter } from "@/components/ui/interactive-filter";
import { formatInteractiveDateRangeSummary } from "@/components/ui/interactive-filter-formatting";
import { useCampaignFunnel, useCampaignGraph, useCampaignStatsOverall, useConversionQuality } from "@/lib/queries/campaigns";
import dayjs from "dayjs";
import { Calendar } from "lucide-react";
import { useState } from "react";

const initialStartDate = dayjs().startOf("month").toDate();
const initialEndDate = dayjs().endOf("day").toDate();

export function CampaignStatsSection() {
	const [period, setPeriod] = useState<{ startDate: Date; endDate: Date }>({
		startDate: initialStartDate,
		endDate: initialEndDate,
	});

	const { data: overall, isLoading: overallLoading } = useCampaignStatsOverall({
		startDate: period.startDate,
		endDate: period.endDate,
	});

	const { data: funnel, isLoading: funnelLoading } = useCampaignFunnel({
		startDate: period.startDate,
		endDate: period.endDate,
	});

	const { data: interactionsGraph, isLoading: interactionsLoading } = useCampaignGraph({
		graphType: "interactions",
		startDate: period.startDate,
		endDate: period.endDate,
	});

	const { data: conversionsGraph, isLoading: conversionsLoading } = useCampaignGraph({
		graphType: "conversions",
		startDate: period.startDate,
		endDate: period.endDate,
	});

	const { data: quality, isLoading: qualityLoading } = useConversionQuality({
		startDate: period.startDate,
		endDate: period.endDate,
	});

	const graphLoading = interactionsLoading || conversionsLoading;

	return (
		<div className="w-full flex flex-col gap-4">
			{/* Period filter — local, independent of comercial tab */}
			<div className="w-full flex items-center justify-end">
				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<Calendar className="h-4 w-4" />
							<InteractiveFilter.Label>PERÍODO</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>
							{formatInteractiveDateRangeSummary(period.startDate.toISOString(), period.endDate.toISOString())}
						</InteractiveFilter.Value>
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-auto p-0">
						<InteractiveFilter.DateRangeContent
							value={{
								from: period.startDate,
								to: period.endDate,
							}}
							onChange={(range) => {
								if (range.from && range.to) {
									setPeriod({ startDate: range.from, endDate: range.to });
								} else if (range.from) {
									setPeriod({ startDate: range.from, endDate: range.from });
								}
							}}
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>
			</div>

			{/* KPIs row */}
			<CampaignKpiCardsBlock funnel={funnel} overall={overall} isLoading={funnelLoading || overallLoading} />

			{/* Funnel + Quality split — lg: items-stretch para igualar altura das colunas */}
			<div className="flex w-full flex-col gap-4 lg:flex-row lg:items-stretch">
				<div className="flex w-full min-h-0 flex-col lg:h-full lg:w-1/3">
					<CampaignFunnelBlock funnel={funnel} isLoading={funnelLoading} />
				</div>
				<div className="flex w-full min-h-0 flex-col gap-4 lg:w-2/3">
					<CampaignQualityCardsBlock quality={quality} isLoading={qualityLoading} />
					<CampaignTriggerDistributionBlock overall={overall} isLoading={overallLoading} />
				</div>
			</div>

			{/* Graph full width */}
			<CampaignGraphBlock interactionsData={interactionsGraph} conversionsData={conversionsGraph} isLoading={graphLoading} />

			{/* Ranking full width */}
			<CampaignRankingBlock startDate={period.startDate} endDate={period.endDate} />
		</div>
	);
}
