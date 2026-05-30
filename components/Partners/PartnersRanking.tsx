"use client";
import type { TGetPartnersRankingInput } from "@/app/api/partners/stats/ranking/route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ranking } from "@/components/ui/ranking";
import { formatDecimalPlaces, formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { usePartnersRanking } from "@/lib/queries/partners";
import { BadgeDollarSign, CirclePlus, IdCard, Phone, Ticket, TrendingUp } from "lucide-react";
import { useState } from "react";

type PartnersRankingProps = {
	periodAfter: Date | null;
	periodBefore: Date | null;
	comparingPeriodAfter?: Date | null;
	comparingPeriodBefore?: Date | null;
};

const RANKING_LABEL_MAP = {
	"sales-total-value": "RANKING POR TOTAL VENDIDO",
	"sales-total-qty": "RANKING POR QUANTIDADE DE VENDAS",
	"average-ticket": "RANKING POR TICKET MÉDIO",
	margin: "RANKING POR MARGEM",
} as const;

export default function PartnersRanking({ periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore }: PartnersRankingProps) {
	const [rankingBy, setRankingBy] = useState<TGetPartnersRankingInput["rankingBy"]>("sales-total-value");

	const { data: rankingData, isLoading: rankingLoading } = usePartnersRanking({
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
						<Ranking.Title>{RANKING_LABEL_MAP[rankingBy]}</Ranking.Title>
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
							<Ranking.SortButton active={rankingBy === "margin"} onClick={() => setRankingBy("margin")} tooltip="Ordenar por Margem">
								<TrendingUp className="h-4 min-h-4 w-4 min-w-4" />
							</Ranking.SortButton>
						</Ranking.Actions>
					</Ranking.Header>
					<Ranking.List>
					{rankingLoading ? (
						<Ranking.Loading />
					) : rankingData && rankingData.length > 0 ? (
						rankingData.map((partner) => {
							const metricConfig =
								rankingBy === "sales-total-value"
									? {
											icon: BadgeDollarSign,
											value: formatToMoney(partner.totalRevenue),
											comparison:
												partner.totalRevenueComparison !== null ? formatToMoney(partner.totalRevenueComparison) : null,
										}
									: rankingBy === "sales-total-qty"
										? {
												icon: CirclePlus,
												value: formatDecimalPlaces(partner.totalSalesQty),
												comparison:
													partner.totalSalesQtyComparison !== null
														? formatDecimalPlaces(partner.totalSalesQtyComparison)
														: null,
											}
										: rankingBy === "average-ticket"
											? {
													icon: Ticket,
													value: formatToMoney(partner.averageTicket),
													comparison:
														partner.averageTicketComparison !== null
															? formatToMoney(partner.averageTicketComparison)
															: null,
												}
											: {
													icon: TrendingUp,
													value: `${formatDecimalPlaces(partner.marginPercentage)}%`,
													comparison:
														partner.marginPercentageComparison !== null
															? `${formatDecimalPlaces(partner.marginPercentageComparison)}%`
															: null,
												};

							return (
								<Ranking.Item key={partner.parceiroId} rank={partner.rank}>
									<Ranking.ItemMedia>
										<Avatar className="h-8 w-8 min-h-8 min-w-8">
											<AvatarImage src={partner.parceiroAvatarUrl ?? undefined} alt={partner.parceiroNome} />
											<AvatarFallback>{formatNameAsInitials(partner.parceiroNome)}</AvatarFallback>
										</Avatar>
									</Ranking.ItemMedia>
									<Ranking.ItemTitleRow>
										<Ranking.ItemTitle>{partner.parceiroNome}</Ranking.ItemTitle>
										<Ranking.ItemDelta rankDelta={partner.rankDelta} />
									</Ranking.ItemTitleRow>
									<Ranking.ItemMeta>
										<div className="flex min-w-0 items-center gap-1.5">
											<div className="flex min-w-0 items-center gap-1">
												<IdCard className="h-3 w-3 min-h-3 min-w-3 shrink-0 opacity-60" />
												<span className="truncate text-[0.65rem] font-medium tabular-nums">{partner.parceiroCpfCnpj}</span>
											</div>
											{partner.parceiroTelefone ? (
												<div className="flex min-w-0 items-center gap-1">
													<Phone className="h-3 w-3 min-h-3 min-w-3 shrink-0 opacity-60" />
													<span className="truncate text-[0.65rem] font-medium tabular-nums">{partner.parceiroTelefone}</span>
												</div>
											) : null}
										</div>
									</Ranking.ItemMeta>
									<Ranking.ItemMetric icon={metricConfig.icon} value={metricConfig.value} />
									<Ranking.ItemComparison value={metricConfig.comparison} />
								</Ranking.Item>
							);
						})
					) : (
						<Ranking.Empty>Nenhum parceiro encontrado para o período selecionado.</Ranking.Empty>
					)}
					</Ranking.List>
				</Ranking.Provider>
			</Ranking.Panel>
		</Ranking.Root>
	);
}
