"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: components/Stats/Blocks/CampaignKpiCardsBlock.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem hooks de dados e sem os estados de loading/vazio.
 * Recebe os números por prop, a partir de `_fixtures/campaign-stats.ts`.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */
import type { TGetCampaignFunnelOutput } from "@/app/api/campaigns/stats/funnel/route";
import type { TGetCampaignStatsOverallOutput } from "@/app/api/campaigns/stats/overall/route";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { BadgeDollarSign, MessageCircle, MousePointerClick, Package, Percent, Sparkles } from "lucide-react";
import StatUnitCard from "@/components/Stats/StatUnitCard";

type CampaignKpiCardsBlockProps = {
	funnel: TGetCampaignFunnelOutput["data"];
	overall: TGetCampaignStatsOverallOutput["data"];
};

export function CampaignKpiCardsBlock({ funnel, overall }: CampaignKpiCardsBlockProps) {
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
