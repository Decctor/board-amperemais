"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: components/Stats/CampaignStatsSection.tsx (commit 19d8578).
 *
 * Mesmo layout do original, sem as 5 queries de stats e sem o `useState` de período.
 * O filtro de período continua desenhado (é o que aparece no print), mas não abre.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */
import { InteractiveFilter } from "@/components/ui/interactive-filter";
import { Calendar } from "lucide-react";
import {
	campaignConversionsGraphFixture,
	campaignFunnelFixture,
	campaignInteractionsGraphFixture,
	campaignOverallFixture,
	campaignQualityFixture,
	campaignRankingFixture,
	MEDIA_PERIOD_LABEL,
} from "../../_fixtures/campaign-stats";
import { CampaignFunnelBlock } from "./CampaignFunnelBlock";
import { CampaignGraphBlock } from "./CampaignGraphBlock";
import { CampaignKpiCardsBlock } from "./CampaignKpiCardsBlock";
import { CampaignQualityCardsBlock } from "./CampaignQualityCardsBlock";
import { CampaignRankingBlock } from "./CampaignRankingBlock";
import { CampaignTriggerDistributionBlock } from "./CampaignTriggerDistributionBlock";

export function CampaignStatsSection() {
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
						<InteractiveFilter.Value>{MEDIA_PERIOD_LABEL}</InteractiveFilter.Value>
					</InteractiveFilter.Trigger>
				</InteractiveFilter.Root>
			</div>

			{/* KPIs row */}
			<CampaignKpiCardsBlock funnel={campaignFunnelFixture} overall={campaignOverallFixture} />

			{/* Funnel + Quality split — lg: items-stretch para igualar altura das colunas */}
			<div className="flex w-full flex-col gap-4 lg:flex-row lg:items-stretch">
				<div className="flex w-full min-h-0 flex-col lg:h-full lg:w-1/3">
					<CampaignFunnelBlock funnel={campaignFunnelFixture} />
				</div>
				<div className="flex w-full min-h-0 flex-col gap-4 lg:w-2/3">
					<CampaignQualityCardsBlock quality={campaignQualityFixture} />
					<CampaignTriggerDistributionBlock overall={campaignOverallFixture} />
				</div>
			</div>

			{/* Graph full width */}
			<CampaignGraphBlock interactionsData={campaignInteractionsGraphFixture} conversionsData={campaignConversionsGraphFixture} />

			{/* Ranking full width */}
			<CampaignRankingBlock ranking={campaignRankingFixture} rankingBy="revenue" />
		</div>
	);
}
