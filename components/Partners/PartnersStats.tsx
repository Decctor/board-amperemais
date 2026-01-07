"use client";
import type { TGetPartnersInput } from "@/app/api/partners/route";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { usePartnersOverallStats } from "@/lib/queries/partners";
import { Activity, BadgeDollarSign, Ticket, Users } from "lucide-react";
import PartnersGraphs from "./PartnersGraphs";
import PartnersRanking from "./PartnersRanking";

type PartnersStatsProps = {
	overallFilters: TGetPartnersInput;
};
export default function PartnersStats({ overallFilters }: PartnersStatsProps) {
	const { data: partnersOverallStats, isLoading: partnersOverallStatsLoading } = usePartnersOverallStats({
		periodAfter: overallFilters.statsPeriodAfter ?? null,
		periodBefore: overallFilters.statsPeriodBefore ?? null,
		comparingPeriodAfter: null,
		comparingPeriodBefore: null,
	});

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="TOTAL DE PARCEIROS"
					icon={<Users className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: partnersOverallStats?.totalPartners.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						partnersOverallStats?.totalPartners.comparison
							? {
									value: partnersOverallStats?.totalPartners.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="PARCEIROS ATIVOS"
					icon={<Activity className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: partnersOverallStats?.activePartners.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						partnersOverallStats?.activePartners.comparison
							? {
									value: partnersOverallStats?.activePartners.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="FATURAMENTO TOTAL"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: partnersOverallStats?.totalRevenue.current || 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						partnersOverallStats?.totalRevenue.comparison
							? {
									value: partnersOverallStats?.totalRevenue.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="TICKET MÉDIO GERAL"
					icon={<Ticket className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: partnersOverallStats?.averageTicket.current || 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						partnersOverallStats?.averageTicket.comparison
							? {
									value: partnersOverallStats?.averageTicket.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
				/>
			</div>
			<div className="w-full flex items-start flex-col lg:flex-row gap-3 max-h-[500px]">
				<div className="w-full lg:w-1/2 h-full">
					<PartnersGraphs periodAfter={overallFilters.statsPeriodAfter} periodBefore={overallFilters.statsPeriodBefore} />
				</div>
				<div className="w-full lg:w-1/2 h-full">
					<PartnersRanking periodAfter={overallFilters.statsPeriodAfter} periodBefore={overallFilters.statsPeriodBefore} />
				</div>
			</div>
		</div>
	);
}
