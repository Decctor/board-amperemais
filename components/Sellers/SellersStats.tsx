"use client";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useSellersOverallStats } from "@/lib/queries/sellers";
import type { TGetSellersDefaultInput } from "@/pages/api/sellers";
import { Activity, BadgeDollarSign, Target, Ticket, Users } from "lucide-react";
import SellersGraphs from "./SellersGraphs";
import SellersRanking from "./SellersRanking";

type SellersStatsProps = {
	overallFilters: TGetSellersDefaultInput;
};
export default function SellersStats({ overallFilters }: SellersStatsProps) {
	const { data: sellersOverallStats, isLoading: sellersOverallStatsLoading } = useSellersOverallStats({
		periodAfter: overallFilters.statsPeriodAfter ?? null,
		periodBefore: overallFilters.statsPeriodBefore ?? null,
		comparingPeriodAfter: null,
		comparingPeriodBefore: null,
	});

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="TOTAL DE VENDEDORES"
					icon={<Users className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: sellersOverallStats?.totalSellers.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						sellersOverallStats?.totalSellers.comparison
							? {
									value: sellersOverallStats?.totalSellers.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="VENDEDORES ATIVOS"
					icon={<Activity className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: sellersOverallStats?.activeSellers.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						sellersOverallStats?.activeSellers.comparison
							? {
									value: sellersOverallStats?.activeSellers.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="FATURAMENTO TOTAL"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: sellersOverallStats?.totalRevenue.current || 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						sellersOverallStats?.totalRevenue.comparison
							? {
									value: sellersOverallStats?.totalRevenue.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="TICKET MÉDIO GERAL"
					icon={<Ticket className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: sellersOverallStats?.averageTicket.current || 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						sellersOverallStats?.averageTicket.comparison
							? {
									value: sellersOverallStats?.averageTicket.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="META VS REALIZADO"
					icon={<Target className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: sellersOverallStats?.goalAchievement.current || 0,
						format: (n) => `${formatDecimalPlaces(n)}%`,
					}}
					previous={
						sellersOverallStats?.goalAchievement.comparison
							? {
									value: sellersOverallStats?.goalAchievement.comparison || 0,
									format: (n) => `${formatDecimalPlaces(n)}%`,
								}
							: undefined
					}
				/>
			</div>
			<div className="w-full flex items-start flex-col lg:flex-row gap-3 max-h-[500px]">
				<div className="w-full lg:w-1/2 h-full">
					<SellersGraphs periodAfter={overallFilters.statsPeriodAfter} periodBefore={overallFilters.statsPeriodBefore} />
				</div>
				<div className="w-full lg:w-1/2 h-full">
					<SellersRanking periodAfter={overallFilters.statsPeriodAfter} periodBefore={overallFilters.statsPeriodBefore} />
				</div>
			</div>
		</div>
	);
}
