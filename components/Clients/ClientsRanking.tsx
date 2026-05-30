"use client";
import type { TGetClientsRankingInput } from "@/app/api/clients/stats/ranking/route";
import { Ranking } from "@/components/ui/ranking";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useClientsRanking } from "@/lib/queries/clients";
import { BadgeDollarSign, CirclePlus, Phone } from "lucide-react";
import { useState } from "react";

type ClientsRankingProps = {
	periodAfter: Date | null;
	periodBefore: Date | null;
	comparingPeriodAfter?: Date | null;
	comparingPeriodBefore?: Date | null;
};

export default function ClientsRanking({ periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore }: ClientsRankingProps) {
	const [rankingBy, setRankingBy] = useState<TGetClientsRankingInput["rankingBy"]>("purchases-total-value");

	const { data: rankingData, isLoading: rankingLoading } = useClientsRanking({
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
						<Ranking.Title>RANKING DE CLIENTES - TOP 10</Ranking.Title>
						<Ranking.Actions>
							<Ranking.SortButton
								active={rankingBy === "purchases-total-value"}
								onClick={() => setRankingBy("purchases-total-value")}
								tooltip="Ordenar por Valor Total"
							>
								<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
							</Ranking.SortButton>
							<Ranking.SortButton
								active={rankingBy === "purchases-total-qty"}
								onClick={() => setRankingBy("purchases-total-qty")}
								tooltip="Ordenar por Quantidade de Compras"
							>
								<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
							</Ranking.SortButton>
						</Ranking.Actions>
					</Ranking.Header>
					<Ranking.List>
					{rankingLoading ? (
						<Ranking.Loading />
					) : rankingData && rankingData.length > 0 ? (
						rankingData.map((client) => {
							const metricConfig =
								rankingBy === "purchases-total-value"
									? {
											icon: BadgeDollarSign,
											value: formatToMoney(client.totalValue),
											comparison: client.totalValueComparison !== null ? formatToMoney(client.totalValueComparison) : null,
										}
									: {
											icon: CirclePlus,
											value: formatDecimalPlaces(client.totalPurchases),
											comparison:
												client.totalPurchasesComparison !== null
													? formatDecimalPlaces(client.totalPurchasesComparison)
													: null,
										};

							return (
								<Ranking.Item key={client.clienteId} rank={client.rank}>
									<Ranking.ItemTitleRow>
										<Ranking.ItemTitle>{client.nome}</Ranking.ItemTitle>
										<Ranking.ItemDelta rankDelta={client.rankDelta} />
									</Ranking.ItemTitleRow>
									<Ranking.ItemMeta icon={Phone}>{client.telefone}</Ranking.ItemMeta>
									<Ranking.ItemMetric icon={metricConfig.icon} value={metricConfig.value} />
									<Ranking.ItemComparison value={metricConfig.comparison} />
								</Ranking.Item>
							);
						})
					) : (
						<Ranking.Empty>Nenhum cliente encontrado para o período selecionado.</Ranking.Empty>
					)}
					</Ranking.List>
				</Ranking.Provider>
			</Ranking.Panel>
		</Ranking.Root>
	);
}
