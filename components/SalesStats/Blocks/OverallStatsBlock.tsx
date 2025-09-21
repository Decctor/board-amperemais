import StatUnitCard from "@/components/Stats/StatUnitCard";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useOverallSalesStats } from "@/lib/queries/stats/overall";
import { cn } from "@/lib/utils";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import type { TUserSession } from "@/schemas/users";
import { Percent, ShoppingBag } from "lucide-react";
import React, { useEffect, useState } from "react";
import { BsCart } from "react-icons/bs";
import { BsFileEarmarkText, BsTicketPerforated } from "react-icons/bs";
import { FaPercent } from "react-icons/fa";
import { VscDiffAdded } from "react-icons/vsc";
import { useDebounce } from "use-debounce";

type OverallStatsBlockProps = {
	user: TUserSession;
	generalQueryParams: TSaleStatsGeneralQueryParams;
};
function OverallStatsBlock({ user, generalQueryParams }: OverallStatsBlockProps) {
	const [queryParams, setQueryParams] = useState<TSaleStatsGeneralQueryParams>(generalQueryParams);

	const [debouncedQueryParams] = useDebounce(queryParams, 1000);

	const { data: overallStats, isLoading: overallStatsLoading } = useOverallSalesStats(debouncedQueryParams);
	useEffect(() => {
		setQueryParams(generalQueryParams);
	}, [generalQueryParams]);
	return (
		<div className="w-full flex flex-col gap-2 py-2">
			<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-xs">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">ACOMPANHAMENTO DE META DO PERÍODO</h1>
					<VscDiffAdded size={12} />
				</div>
				<div className="w-full flex items-center justify-center p-2">
					<GoalTrackingBar
						barBgColor="bg-gradient-to-r from-yellow-200 to-amber-400"
						goalText={`${overallStats?.faturamentoMeta || "..."}`}
						barHeigth="25px"
						valueGoal={overallStats?.faturamentoMeta || 0}
						valueHit={overallStats?.faturamentoBruto.atual || 0}
						formattedValueGoal={formatToMoney(overallStats?.faturamentoMeta || 0)}
						formattedValueHit={formatToMoney(overallStats?.faturamentoBruto.atual || 0)}
					/>
				</div>
			</div>

			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Número de Vendas"
					icon={<VscDiffAdded className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: overallStats?.qtdeVendas.atual || 0, format: (n) => formatDecimalPlaces(n) }}
					previous={
						overallStats?.qtdeVendas.anterior ? { value: overallStats?.qtdeVendas.anterior || 0, format: (n) => formatDecimalPlaces(n) } : undefined
					}
					className="w-full lg:w-1/4"
				/>
				<StatUnitCard
					title="Faturamento"
					icon={<BsFileEarmarkText className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: overallStats?.faturamentoBruto.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						overallStats?.faturamentoBruto.anterior ? { value: overallStats.faturamentoBruto.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/4"
				/>
				<StatUnitCard
					title="Faturamento Líquido"
					icon={<BsFileEarmarkText className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: overallStats?.faturamentoLiquido.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						overallStats?.faturamentoLiquido.anterior
							? { value: overallStats.faturamentoLiquido.anterior || 0, format: (n) => formatToMoney(n) }
							: undefined
					}
					className="w-full lg:w-1/4"
				/>
				<StatUnitCard
					title="Margem"
					icon={<Percent className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: (100 * (overallStats?.faturamentoLiquido.atual || 0)) / (overallStats?.faturamentoBruto.atual || 0),
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						overallStats?.faturamentoLiquido.anterior && overallStats?.faturamentoBruto.anterior
							? {
									value: (100 * (overallStats.faturamentoLiquido.anterior || 0)) / (overallStats.faturamentoBruto.anterior || 0),
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
					className="w-full lg:w-1/4"
				/>
			</div>
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Ticket Médio"
					icon={<BsTicketPerforated className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: overallStats?.ticketMedio.atual || 0, format: (n) => formatToMoney(n) }}
					previous={overallStats?.ticketMedio.anterior ? { value: overallStats.ticketMedio.anterior || 0, format: (n) => formatToMoney(n) } : undefined}
					className="w-full lg:w-1/3"
				/>
				<StatUnitCard
					title="Valor Diário Vendido"
					icon={<BsCart className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: overallStats?.valorDiarioVendido.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						overallStats?.valorDiarioVendido.anterior
							? { value: overallStats.valorDiarioVendido.anterior || 0, format: (n) => formatToMoney(n) }
							: undefined
					}
					className="w-full lg:w-1/3"
				/>
				<StatUnitCard
					title="Média de Itens por Venda"
					icon={<ShoppingBag className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: overallStats?.itensPorVendaMedio.atual || 0, format: (n) => formatDecimalPlaces(n) }}
					previous={
						overallStats?.itensPorVendaMedio.anterior
							? { value: overallStats.itensPorVendaMedio.anterior || 0, format: (n) => formatDecimalPlaces(n) }
							: undefined
					}
					className="w-full lg:w-1/3"
				/>
			</div>
		</div>
	);
}

export default OverallStatsBlock;

type GoalTrackingBarProps = {
	valueGoal?: number;
	valueHit: number;
	formattedValueGoal?: string;
	formattedValueHit?: string;
	goalText: string;
	barHeigth: string;
	barBgColor: string;
};
function GoalTrackingBar({ valueGoal, valueHit, formattedValueGoal, formattedValueHit, goalText, barHeigth, barBgColor }: GoalTrackingBarProps) {
	function getPercentage({ goal, hit }: { goal: number | undefined; hit: number | undefined }) {
		if (!hit || hit === 0) return "0%";
		if (!goal && hit) return "100%";
		if (goal && !hit) return "0%";
		if (goal && hit) {
			const percentage = ((hit / goal) * 100).toFixed(2);
			return `${percentage}%`;
		}
		// return `${(Math.random() * 100).toFixed(2)}%`
	}
	function getWidth({ goal, hit }: { goal: number | undefined; hit: number | undefined }) {
		if (!hit || hit === 0) return "0%";
		if (!goal && hit) return "100%";
		if (goal && !hit) return "0%";
		if (goal && hit) {
			let percentage: number | string = (hit / goal) * 100;
			percentage = percentage > 100 ? 100 : percentage.toFixed(2);
			return `${percentage}%`;
		}
		// return `${(Math.random() * 100).toFixed(2)}%`
	}

	return (
		<div className="flex w-full items-center gap-1">
			<div className="flex grow gap-2">
				<div className="grow">
					<div
						style={{
							width: getWidth({ goal: valueGoal, hit: valueHit }),
							height: barHeigth,
						}}
						className={cn("flex items-center justify-center rounded-sm text-xs text-white shadow-sm", barBgColor)}
					/>
				</div>
			</div>
			<div className="flex min-w-[70px] flex-col items-end justify-end lg:min-w-[100px]">
				<p className="text-xs font-medium uppercase tracking-tight lg:text-sm">{getPercentage({ goal: valueGoal, hit: valueHit })}</p>
				<p className="text-[0.5rem] italic text-gray-500 lg:text-[0.65rem]">
					<strong>{formattedValueHit || valueHit?.toLocaleString("pt-br", { maximumFractionDigits: 2 }) || 0}</strong> de{" "}
					<strong>
						{formattedValueGoal ||
							valueGoal?.toLocaleString("pt-br", {
								maximumFractionDigits: 2,
							}) ||
							0}
					</strong>{" "}
				</p>
			</div>
		</div>
	);
}
