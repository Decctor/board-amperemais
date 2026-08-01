"use client";

import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { WeeklyRevenueHeatmap } from "@/components/SalesStats/Blocks/WeeklyRevenueHeatmap";
import { SellerResultsByMonthBlock, SellerResultsByMonthDayBlock, SellerResultsByWeekDayBlock } from "@/components/SellerStats/Blocks/PeriodHeatmapBlocks";
import { SellerTopClientsBlock, SellerTopProductGroupsBlock, SellerTopProductsBlock } from "@/components/SellerStats/Blocks/TopRankingBlocks";
import { GoalTrackingCard } from "@/components/Stats/GoalTrackingBar";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useSellerStats } from "@/lib/queries/sellers";
import dayjs from "dayjs";
import { BadgeDollarSign, ChartColumn, ShoppingCart, Target, Ticket } from "lucide-react";
import Link from "next/link";

type ResultsProps = {
	sellerId: string;
};

// Visão "primeira pessoa" dos resultados: reaproveita as consultas que o gestor já usa
// (getSellerStats), filtradas para o vendedor logado. Default: mês corrente até hoje.
export function Results({ sellerId }: ResultsProps) {
	const { getPrimaryGradientStyle } = useOrgColors();
	const { data, isLoading, error, filters, updateFilters } = useSellerStats({
		sellerId,
		initialFilters: {
			periodAfter: dayjs().startOf("month").toISOString(),
			periodBefore: dayjs().endOf("day").toISOString(),
		},
	});

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<DateIntervalInput
					label="Período"
					value={{
						after: filters.periodAfter ? new Date(filters.periodAfter) : undefined,
						before: filters.periodBefore ? new Date(filters.periodBefore) : undefined,
					}}
					handleChange={(value) => updateFilters({ periodAfter: value.after?.toISOString(), periodBefore: value.before?.toISOString() })}
				/>
			</div>
			{isLoading ? <LoadingComponent /> : null}
			{error ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{data ? (
				<>
					<div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
						<StatUnitCard
							title="VENDIDO NO PERÍODO"
							icon={<BadgeDollarSign className="h-4 w-4 min-h-4 min-w-4" />}
							current={{ value: data.faturamentoBrutoTotal || 0, format: (n) => formatToMoney(n) }}
						/>
						<StatUnitCard
							title="META DO PERÍODO"
							icon={<Target className="h-4 w-4 min-h-4 min-w-4" />}
							current={{ value: data.faturamentoMeta || 0, format: (n) => formatToMoney(n) }}
						/>
						<StatUnitCard
							title="VENDAS NO PERÍODO"
							icon={<ShoppingCart className="h-4 w-4 min-h-4 min-w-4" />}
							current={{ value: data.qtdeVendas || 0, format: (n) => formatDecimalPlaces(n) }}
						/>
						<StatUnitCard
							title="TICKET MÉDIO"
							icon={<Ticket className="h-4 w-4 min-h-4 min-w-4" />}
							current={{ value: data.ticketMedio || 0, format: (n) => formatToMoney(n) }}
						/>
					</div>

					<GoalTrackingCard
						goalText="Acompanhamento da meta do período"
						valueGoal={data.faturamentoMeta}
						valueHit={data.faturamentoBrutoTotal}
						formattedValueGoal={formatToMoney(data.faturamentoMeta || 0)}
						formattedValueHit={formatToMoney(data.faturamentoBrutoTotal || 0)}
						barHeight="25px"
						barStyle={getPrimaryGradientStyle()}
					/>

					<div className="w-full">
						<WeeklyRevenueHeatmap.Frame hint="A intensidade da cor indica o volume de faturamento em cada horário. Passe o mouse para ver os detalhes.">
							<WeeklyRevenueHeatmap.WeekDayStrip
								data={data.resultadosAgrupados.diaSemana.map((item) => ({ diaSemana: item.diaSemana, qtde: item.quantidade, total: item.total }))}
							/>
							<WeeklyRevenueHeatmap.Grid
								data={data.resultadosAgrupados.diaSemanaHora.map((item) => ({
									diaSemana: item.diaSemana,
									hora: item.hora,
									qtde: item.quantidade,
									total: item.total,
								}))}
							/>
						</WeeklyRevenueHeatmap.Frame>
					</div>

					<div className="flex w-full flex-col lg:flex-row gap-3 items-stretch">
						<div className="w-full lg:w-1/3">
							<SellerResultsByMonthDayBlock data={data.resultadosAgrupados.dia} />
						</div>
						<div className="w-full lg:w-1/3">
							<SellerResultsByMonthBlock data={data.resultadosAgrupados.mes} />
						</div>
						<div className="w-full lg:w-1/3">
							<SellerResultsByWeekDayBlock data={data.resultadosAgrupados.diaSemana} />
						</div>
					</div>
					<div className="flex w-full flex-col lg:flex-row gap-3 items-stretch">
						<div className="w-full lg:w-1/3">
							<SellerTopProductsBlock data={data.resultadosAgrupados.produto} />
						</div>
						<div className="w-full lg:w-1/3">
							<SellerTopClientsBlock data={data.resultadosAgrupados.cliente} />
						</div>
						<div className="w-full lg:w-1/3">
							<SellerTopProductGroupsBlock data={data.resultadosAgrupados.grupo} />
						</div>
					</div>

					<SectionWrapper title="Painel completo" icon={<ChartColumn className="h-4 w-4 min-h-4 min-w-4" />}>
						<div className="flex flex-col items-start gap-2">
							<p className="text-sm text-muted-foreground">Perfil, edição e histórico completo ficam no seu painel detalhado de vendedor.</p>
							<Button asChild variant="outline" size="sm">
								<Link href={appRoutes.management.seller(sellerId)}>Ver painel completo</Link>
							</Button>
						</div>
					</SectionWrapper>
				</>
			) : null}
		</div>
	);
}
