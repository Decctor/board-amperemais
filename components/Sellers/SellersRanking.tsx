"use client";
import type { TGetSellersRankingInput } from "@/app/api/sellers/stats/ranking/route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ranking } from "@/components/ui/ranking";
import { formatDecimalPlaces, formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { useSellersRanking } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import { BadgeDollarSign, CirclePlus, Target, Ticket, type LucideIcon } from "lucide-react";
import { useState } from "react";

type SellersRankingProps = {
	periodAfter: Date | null;
	periodBefore: Date | null;
	comparingPeriodAfter?: Date | null;
	comparingPeriodBefore?: Date | null;
};

const RANKING_LABEL_MAP = {
	"sales-total-value": "RANKING POR TOTAL VENDIDO",
	"sales-total-qty": "RANKING POR QUANTIDADE DE VENDAS",
	"average-ticket": "RANKING POR TICKET MÉDIO",
	"goal-achievement": "RANKING POR META ATINGIDA",
} as const;

export default function SellersRanking({ periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore }: SellersRankingProps) {
	const [rankingBy, setRankingBy] = useState<TGetSellersRankingInput["rankingBy"]>("sales-total-value");

	const { data: rankingData, isLoading: rankingLoading } = useSellersRanking({
		rankingBy,
		periodAfter: periodAfter ?? null,
		periodBefore: periodBefore ?? null,
		comparingPeriodAfter: comparingPeriodAfter ?? null,
		comparingPeriodBefore: comparingPeriodBefore ?? null,
	});

	return (
		<Ranking.Root>
			<Ranking.Panel>
				<Ranking.Provider>
					<Ranking.Header>
						<Ranking.Title>{RANKING_LABEL_MAP[rankingBy ?? "sales-total-value"]}</Ranking.Title>
						<Ranking.Actions>
							<Ranking.SortButton
								active={rankingBy === "sales-total-value"}
								onClick={() => setRankingBy("sales-total-value")}
								tooltip="Ordenar por Faturamento"
							>
								<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
							</Ranking.SortButton>
							<Ranking.SortButton
								active={rankingBy === "sales-total-qty"}
								onClick={() => setRankingBy("sales-total-qty")}
								tooltip="Ordenar por Quantidade"
							>
								<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
							</Ranking.SortButton>
							<Ranking.SortButton
								active={rankingBy === "average-ticket"}
								onClick={() => setRankingBy("average-ticket")}
								tooltip="Ordenar por Ticket Médio"
							>
								<Ticket className="h-4 min-h-4 w-4 min-w-4" />
							</Ranking.SortButton>
							<Ranking.SortButton
								active={rankingBy === "goal-achievement"}
								onClick={() => setRankingBy("goal-achievement")}
								tooltip="Ordenar por Meta Atingida"
							>
								<Target className="h-4 min-h-4 w-4 min-w-4" />
							</Ranking.SortButton>
						</Ranking.Actions>
					</Ranking.Header>
					<Ranking.List>
					{rankingLoading ? (
						<Ranking.Loading />
					) : rankingData && rankingData.length > 0 ? (
						rankingData.map((seller) => {
							let metricConfig: {
								icon: LucideIcon;
								value: string;
								comparison: string | null;
								className?: string;
							};

							if (rankingBy === "sales-total-value") {
								metricConfig = {
									icon: BadgeDollarSign,
									value: formatToMoney(seller.totalRevenue),
									comparison:
										seller.totalRevenueComparison !== null ? formatToMoney(seller.totalRevenueComparison) : null,
								};
							} else if (rankingBy === "sales-total-qty") {
								metricConfig = {
									icon: CirclePlus,
									value: formatDecimalPlaces(seller.totalSalesQty),
									comparison:
										seller.totalSalesQtyComparison !== null
											? formatDecimalPlaces(seller.totalSalesQtyComparison)
											: null,
								};
							} else if (rankingBy === "average-ticket") {
								metricConfig = {
									icon: Ticket,
									value: formatToMoney(seller.averageTicket),
									comparison:
										seller.averageTicketComparison !== null
											? formatToMoney(seller.averageTicketComparison)
											: null,
								};
							} else {
								metricConfig = {
									icon: Target,
									value: `${formatDecimalPlaces(seller.goalAchievementPercentage)}%`,
									comparison:
										seller.goalAchievementPercentageComparison !== null
											? `${formatDecimalPlaces(seller.goalAchievementPercentageComparison)}%`
											: null,
									className: cn(
										seller.goalAchievementPercentage >= 100 && "bg-green-500/20 text-green-700 dark:text-green-400",
										seller.goalAchievementPercentage >= 75 &&
											seller.goalAchievementPercentage < 100 &&
											"bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
										seller.goalAchievementPercentage < 75 && "bg-red-500/20 text-red-700 dark:text-red-400",
									),
								};
							}

							return (
								<Ranking.Item key={seller.vendedorId} rank={seller.rank}>
									<Ranking.ItemMedia>
										<Avatar className="h-8 w-8 min-h-8 min-w-8">
											<AvatarImage src={seller.vendedorAvatarUrl ?? undefined} alt={seller.vendedorNome} />
											<AvatarFallback>{formatNameAsInitials(seller.vendedorNome)}</AvatarFallback>
										</Avatar>
									</Ranking.ItemMedia>
									<Ranking.ItemTitleRow>
										<Ranking.ItemTitle>{seller.vendedorNome}</Ranking.ItemTitle>
										<Ranking.ItemDelta rankDelta={seller.rankDelta} />
									</Ranking.ItemTitleRow>
									<Ranking.ItemMetric
										icon={metricConfig.icon}
										value={metricConfig.value}
										className={metricConfig.className}
									/>
									<Ranking.ItemComparison value={metricConfig.comparison} />
								</Ranking.Item>
							);
						})
					) : (
						<Ranking.Empty>Nenhum vendedor encontrado para o período selecionado.</Ranking.Empty>
					)}
					</Ranking.List>
				</Ranking.Provider>
			</Ranking.Panel>
		</Ranking.Root>
	);
}
