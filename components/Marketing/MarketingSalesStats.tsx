import { getFirstDayOfMonth, getLastDayOfMonth } from "@/lib/dates";
import { formatDateForInputValue, formatDateOnInputChange, formatToMoney } from "@/lib/formatting";
import { useSalesMarketingStats } from "@/lib/queries/stats/marketing";
import type { TSalesMarketingStatsFilters } from "@/schemas/query-params-utils";
import React, { useState } from "react";
import { BsFileEarmarkText, BsMegaphoneFill } from "react-icons/bs";
import { FaUserPlus } from "react-icons/fa";
import { MdAttachMoney } from "react-icons/md";
import { VscDiffAdded } from "react-icons/vsc";
import { useDebounce } from "use-debounce";
import DateInput from "../Inputs/DateInput";

const currentDate = new Date();
const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString();
const lastDayOfMonth = getLastDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString();

function MarketingSalesStats() {
	const [filters, setFilters] = useState<TSalesMarketingStatsFilters>({
		period: {
			after: firstDayOfMonth,
			before: lastDayOfMonth,
		},
	});
	const [filtersDebounced] = useDebounce(filters, 500);

	const { data: stats, isLoading, isError, isSuccess, error } = useSalesMarketingStats(filtersDebounced);
	return (
		<div className="flex h-full flex-col gap-6">
			<div className="flex w-full flex-col items-center justify-between lg:flex-row gap-2">
				<h1 className="text-lg font-bold">Resultados de Marketing</h1>
				<div className="flex w-full flex-col lg:w-fit">
					<div className="flex flex-col items-center gap-2 lg:flex-row">
						<div className="w-full lg:w-[150px]">
							<DateInput
								label="PERÍODO"
								showLabel={false}
								value={formatDateForInputValue(filters.period.after)}
								handleChange={(value) =>
									setFilters((prev) => ({
										...prev,
										period: {
											...prev.period,
											after: (formatDateOnInputChange(value) as string) || firstDayOfMonth,
										},
									}))
								}
								width="100%"
							/>
						</div>
						<div className="w-full lg:w-[150px]">
							<DateInput
								label="PERÍODO"
								showLabel={false}
								value={formatDateForInputValue(filters.period.before)}
								handleChange={(value) =>
									setFilters((prev) => ({
										...prev,
										period: {
											...prev.period,
											before: (formatDateOnInputChange(value) as string) || lastDayOfMonth,
										},
									}))
								}
								width="100%"
							/>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col gap-6 p-3">
				<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
					<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/5 overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Valor investido</h1>
							<BsMegaphoneFill size={12} />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="text-xl font-bold text-[#15599a]">{formatToMoney(stats?.valorInvestidoTotal || 0)}</div>
						</div>
					</div>
					<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/5 overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">VALOR VENDIDO TOTAL</h1>
							<BsFileEarmarkText size={12} />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="text-xl font-bold text-[#15599a]">{formatToMoney(stats?.valorVendidoTotal || 0)}</div>
						</div>
					</div>
					<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/5 overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">NÚMERO DE VENDAS TOTAL</h1>
							<VscDiffAdded size={12} />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="text-xl font-bold text-[#15599a]">{stats?.qtdeVendasTotal || 0}</div>
						</div>
					</div>
					<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/5 overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">VALOR POR NOVOS CLIENTES</h1>
							<MdAttachMoney size={12} />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="text-xl font-bold text-[#15599a]">{formatToMoney(stats?.valorVendidoPrimeirasVendas || 0)}</div>
							<div className="text-xs font-bold text-primary">{formatToMoney(stats?.valorVendidoRetencao || 0)} por retenção</div>
						</div>
					</div>
					<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/5 overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Número de vendas por Novos Clientes</h1>
							<FaUserPlus size={12} />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="text-xl font-bold text-[#15599a]">{stats?.qtdeVendasPrimeirasVendas || 0}</div>
							<div className="text-xs font-bold text-primary">{stats?.qtdeVendasRetencao || 0} por retenção</div>
						</div>
					</div>
				</div>
				<h1 className="w-full text-center tracking-tight font-medium text-sm">Avaliação por Fontes de Investimento</h1>
				<div className="w-full flex items-start justify-around flex-wrap gap-3">
					{stats?.porControle.map((control, index) => (
						<div
							key={`${control.controle}-${index}`}
							className="flex min-h-[90px] w-full lg:w-[500px] flex-col rounded-xl border border-primary shadow-sm overflow-hidden"
						>
							<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41] text-primary">
								<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">{control.controle}</h1>
								<BsMegaphoneFill size={12} />
							</div>
							<div className="w-full flex flex-col gap-2 grow px-6 py-4">
								<div className="flex flex-col gap-1 items-center">
									<h1 className="font-black tracking-tight">{control.qtdeVendasPrimeirasVendas}</h1>
									<p className="text-xs font-normal text-primary/80">NÚMERO DE PRIMEIRAS COMPRAS</p>
								</div>
								<div className="flex flex-col gap-1 items-center">
									<h1 className="font-black tracking-tight">{formatToMoney(control.valorVendidoPrimeirasVendas)}</h1>
									<p className="text-xs font-normal text-primary/80">VALOR POR PRIMEIRAS COMPRAS</p>
								</div>
								<div className="flex flex-col gap-1 items-center">
									<h1 className="font-black tracking-tight">{formatToMoney(control.qtdeVendasPrimeirasVendas / control.valorInvestido || 0)}</h1>
									<p className="text-xs font-normal text-primary/80">CPL</p>
								</div>
							</div>
							<div className="flex items-center gap-2 justify-center bg-[#fead41] w-full p-3">
								<h1 className="text-xs font-black tracking-tight text-primary">{formatToMoney(control.valorInvestido)}</h1>
								<p className="text-[0.7rem] font-normal text-primary">INVESTIDOS</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default MarketingSalesStats;
