"use client";
import type { TGetCampaignFunnelOutput } from "@/app/api/campaigns/stats/funnel/route";
import type { TGetCampaignStatsOverallOutput } from "@/app/api/campaigns/stats/overall/route";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { BadgeDollarSign, MessageCircle, MousePointerClick, Package, Percent, Sparkles } from "lucide-react";
import StatUnitCard from "../StatUnitCard";

type CampaignKpiCardsBlockProps = {
	funnel: TGetCampaignFunnelOutput["data"] | undefined;
	overall: TGetCampaignStatsOverallOutput["data"] | undefined;
	isLoading: boolean;
};

export function CampaignKpiCardsBlock({ funnel, overall, isLoading }: CampaignKpiCardsBlockProps) {
	if (isLoading) {
		return (
			<div className="flex w-full gap-3 flex-wrap">
				{[...Array(6)].map((_, i) => (
					<div key={i} className="flex-1 min-w-[140px] h-[88px] rounded-xl border bg-muted/40 animate-pulse" />
				))}
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
			<StatUnitCard
				title="MENSAGENS ENVIADAS"
				current={{ value: funnel?.enviados ?? 0, format: (n) => formatDecimalPlaces(n) }}
				icon={<MessageCircle className="w-4 h-4" />}
				className="w-full lg:w-1/6"
			/>
			<StatUnitCard
				title="TAXA DE ENTREGA"
				current={{ value: funnel?.taxaEntrega ?? 0, format: (n) => `${formatDecimalPlaces(n)}%` }}
				icon={<Package className="w-4 h-4" />}
				className="w-full lg:w-1/6"
			/>
			<StatUnitCard
				title="TAXA DE LEITURA"
				current={{ value: funnel?.taxaLeitura ?? 0, format: (n) => `${formatDecimalPlaces(n)}%` }}
				icon={<Percent className="w-4 h-4" />}
				className="w-full lg:w-1/6"
			/>
			<StatUnitCard
				title="TAXA DE CONVERSÃO"
				current={{ value: funnel?.taxaConversaoGeral ?? 0, format: (n) => `${formatDecimalPlaces(n)}%` }}
				icon={<MousePointerClick className="w-4 h-4" />}
				className="w-full lg:w-1/6"
			/>
			<StatUnitCard
				title="RECEITA ATRIBUÍDA"
				current={{ value: overall?.totais.receita ?? 0, format: (n) => formatToMoney(n) }}
				icon={<BadgeDollarSign className="w-4 h-4" />}
				className="w-full lg:w-1/6"
			/>
			<StatUnitCard
				title="RECEITA INCREMENTAL"
				current={{ value: overall?.totais.receitaIncremental ?? 0, format: (n) => formatToMoney(n) }}
				icon={<Sparkles className="w-4 h-4" />}
				className="w-full lg:w-1/6"
			/>
		</div>
	);
}
