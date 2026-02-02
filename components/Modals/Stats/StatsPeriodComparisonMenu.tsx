"use client";
import DateInput from "@/components/Inputs/DateInput";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import MultipleSalesSelectInput from "@/components/Inputs/SelectMultipleSalesInput";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlideMotionVariants } from "@/lib/animations";
import {
	formatDateAsLocale,
	formatDateForInputValue,
	formatDateOnInputChange,
	formatDecimalPlaces,
	formatLongString,
	formatToMoney,
} from "@/lib/formatting";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useStatsComparison } from "@/lib/queries/stats/comparison";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import { cn } from "@/lib/utils";
import type { TStatsComparisonOutput } from "@/pages/api/stats/comparison";
import type { TSale } from "@/schemas/sales";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownNarrowWide, BadgeDollarSign, Box, ChevronDown, ChevronUp, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import React, { useState } from "react";
import { BsCart, BsFileEarmarkText, BsTicketPerforated } from "react-icons/bs";
import { VscDiffAdded } from "react-icons/vsc";
import { VariableSizeList } from "react-window";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
type StatsPeriodComparisonMenuProps = {
	closeMenu: () => void;
};
function StatsPeriodComparisonMenu({ closeMenu }: StatsPeriodComparisonMenuProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const TITLE = "COMPARE PERÍODOS";
	const DESCRIPTION = "Defina os períodos para comparação e veja os resultados.";
	return isDesktop ? (
		<Dialog open={true} onOpenChange={closeMenu}>
			<DialogContent className="min-w-[80%] w-[80%] h-[85vh]">
				<DialogHeader>
					<DialogTitle>{TITLE}</DialogTitle>
					<DialogDescription>{DESCRIPTION}</DialogDescription>
				</DialogHeader>
				<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex flex-1 flex-col gap-3 overflow-auto px-4 py-2 lg:px-2">
					<StatsPeriodComparisonMenuData />
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">FECHAR</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	) : (
		<Drawer open={true} onOpenChange={closeMenu}>
			<DrawerContent className="h-[85vh] flex flex-col">
				<DrawerHeader className="text-left">
					<DrawerTitle>{TITLE}</DrawerTitle>
					<DrawerDescription>{DESCRIPTION}</DrawerDescription>
				</DrawerHeader>
				<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex flex-1 flex-col gap-3 overflow-auto px-4 py-2 lg:px-2">
					<StatsPeriodComparisonMenuData />
				</div>
				<DrawerFooter className="pt-2">
					<DrawerClose asChild>
						<Button variant="outline">FECHAR</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export default StatsPeriodComparisonMenu;

function StatsPeriodComparisonMenuData() {
	const { data: stats, filters, updateFilters } = useStatsComparison({ initialFilters: {} });
	const { data: filterOptions } = useSaleQueryFilterOptions();

	const [showAdditionalFiltersMenu, setShowAdditionalFiltersMenu] = useState(false);
	const firstPeriodChartConfig = {
		titulo: {
			label: "Data",
		},

		qtdeVendas: {
			label: "Quantidade Vendida",
			color: "#3b82f6", // blue hex =
		},
		totalVendido: {
			label: "Valor Vendido",
			color: "#15599a",
		},
	};
	const secondPeriodChartConfig = {
		titulo: {
			label: "Data",
		},

		qtdeVendas: {
			label: "Quantidade Vendida",
			color: "#facc15", // blue hex =
		},
		totalVendido: {
			label: "Valor Vendido",
			color: "#FFB900",
		},
	};

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center flex-col lg:flex-row gap-2">
				<div className="flex items-center gap-2 w-full lg:w-1/2">
					<div className="w-full lg:w-1/2">
						<DateInput
							label="INÍCIO DO PRIMEIRO PERÍODO"
							labelClassName="text-[0.6rem]"
							holderClassName="text-xs p-2 min-h-[34px]"
							value={formatDateForInputValue(filters.firstPeriod.after)}
							handleChange={(value) => {
								updateFilters({
									firstPeriod: {
										...filters.firstPeriod,
										after: formatDateOnInputChange(value, "string") as string,
									},
								});
							}}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<DateInput
							label="FIM DO PRIMEIRO PERÍODO"
							labelClassName="text-[0.6rem]"
							holderClassName="text-xs p-2 min-h-[34px]"
							value={formatDateForInputValue(filters.firstPeriod.before)}
							handleChange={(value) => {
								updateFilters({
									firstPeriod: {
										...filters.firstPeriod,
										before: formatDateOnInputChange(value, "string") as string,
									},
								});
							}}
						/>
					</div>
				</div>
				<div className="flex items-center gap-2 w-full lg:w-1/2">
					<div className="w-full lg:w-1/2">
						<DateInput
							label="INÍCIO DO SEGUNDO PERÍODO"
							labelClassName="text-[0.6rem]"
							holderClassName="text-xs p-2 min-h-[34px]"
							value={formatDateForInputValue(filters.secondPeriod.after)}
							handleChange={(value) => {
								updateFilters({
									secondPeriod: {
										...filters.secondPeriod,
										after: formatDateOnInputChange(value, "string") as string,
									},
								});
							}}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<DateInput
							label="FIM DO SEGUNDO PERÍODO"
							labelClassName="text-[0.6rem]"
							holderClassName="text-xs p-2 min-h-[34px]"
							value={formatDateForInputValue(filters.secondPeriod.before)}
							handleChange={(value) => {
								updateFilters({
									secondPeriod: {
										...filters.secondPeriod,
										before: formatDateOnInputChange(value, "string") as string,
									},
								});
							}}
						/>
					</div>
				</div>
			</div>
			{/** GENERAL STATS */}
			<div className="w-full flex flex-col gap-4">
				<div className="w-full flex flex-col lg:flex-row gap-4 items-center">
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary/20 bg-card p-4 shadow-2xs gap-1">
						<div className="flex items-center justify-between">
							<h1 className="text-xs font-medium tracking-tight uppercase">FATURAMENTO BRUTO</h1>
							<BsFileEarmarkText className="w-4 h-4 text-primary/60" />
						</div>
						<div className="flex flex-col gap-2 mt-1">
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#15599a] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold leading-none">{formatToMoney(stats?.faturamentoBruto.primeiroPeriodo || 0)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">1º PERÍODO</span>
								</div>
							</div>
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#FFB900] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold text-[#FFB900] leading-none">{formatToMoney(stats?.faturamentoBruto.segundoPeriodo || 0)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">2º PERÍODO</span>
								</div>
							</div>
						</div>
					</div>
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary/20 bg-card p-4 shadow-2xs gap-1">
						<div className="flex items-center justify-between">
							<h1 className="text-xs font-medium tracking-tight uppercase">FATURAMENTO LÍQUIDO</h1>
							<BsFileEarmarkText className="w-4 h-4 text-primary/60" />
						</div>
						<div className="flex flex-col gap-2 mt-1">
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#15599a] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold leading-none">{formatToMoney(stats?.faturamentoLiquido.primeiroPeriodo || 0)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">1º PERÍODO</span>
								</div>
							</div>
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#FFB900] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold text-[#FFB900] leading-none">{formatToMoney(stats?.faturamentoLiquido.segundoPeriodo || 0)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">2º PERÍODO</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="w-full flex flex-col lg:flex-row gap-4 items-center">
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary/20 bg-card p-4 shadow-2xs gap-1">
						<div className="flex items-center justify-between">
							<h1 className="text-xs font-medium tracking-tight uppercase">Número de Vendas</h1>
							<VscDiffAdded className="w-4 h-4 text-primary/60" />
						</div>
						<div className="flex flex-col gap-2 mt-1">
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#15599a] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold leading-none">{stats?.qtdeVendas.primeiroPeriodo}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">1º PERÍODO</span>
								</div>
							</div>
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#FFB900] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold text-[#FFB900] leading-none">{stats?.qtdeVendas.segundoPeriodo}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">2º PERÍODO</span>
								</div>
							</div>
						</div>
					</div>
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary/20 bg-card p-4 shadow-2xs gap-1">
						<div className="flex items-center justify-between">
							<h1 className="text-xs font-medium tracking-tight uppercase">TICKET MÉDIO</h1>
							<BsTicketPerforated className="w-4 h-4 text-primary/60" />
						</div>
						<div className="flex flex-col gap-2 mt-1">
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#15599a] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold leading-none">{formatToMoney(stats?.ticketMedio.primeiroPeriodo || 0)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">1º PERÍODO</span>
								</div>
							</div>
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#FFB900] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold text-[#FFB900] leading-none">{formatToMoney(stats?.ticketMedio.segundoPeriodo || 0)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">2º PERÍODO</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="w-full flex flex-col lg:flex-row gap-4 items-center">
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary/20 bg-card p-4 shadow-2xs gap-1">
						<div className="flex items-center justify-between">
							<h1 className="text-xs font-medium tracking-tight uppercase">VALOR DIÁRIO</h1>
							<BsCart className="w-4 h-4 text-primary/60" />
						</div>
						<div className="flex flex-col gap-2 mt-1">
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#15599a] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold leading-none">{formatToMoney(stats?.valorDiarioVendido.primeiroPeriodo || 0)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">1º PERÍODO</span>
								</div>
							</div>
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#FFB900] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold text-[#FFB900] leading-none">{formatToMoney(stats?.valorDiarioVendido.segundoPeriodo || 0)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">2º PERÍODO</span>
								</div>
							</div>
						</div>
					</div>
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary/20 bg-card p-4 shadow-2xs gap-1">
						<div className="flex items-center justify-between">
							<h1 className="text-xs font-medium tracking-tight uppercase">MÉDIA DE ITENS POR VENDA</h1>
							<ShoppingBag className="w-4 h-4 text-primary/60" />
						</div>
						<div className="flex flex-col gap-2 mt-1">
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#15599a] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold leading-none">{formatDecimalPlaces(stats?.itensPorVendaMedio.primeiroPeriodo || 0, 1, 1)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">1º PERÍODO</span>
								</div>
							</div>
							<div className="w-full flex items-center justify-between gap-2 border-l-4 border-[#FFB900] pl-2 py-0.5">
								<div className="flex flex-col">
									<h2 className="text-lg font-bold text-[#FFB900] leading-none">{formatDecimalPlaces(stats?.itensPorVendaMedio.segundoPeriodo || 0, 1, 1)}</h2>
									<span className="text-[0.6rem] text-muted-foreground uppercase font-medium">2º PERÍODO</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col lg:flex-row gap-4 items-center">
				<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary/20 bg-card shadow-2xs overflow-hidden">
					<div className="py-2 px-4 flex items-center justify-between w-full border-b border-primary/10">
						<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">GRÁFICO DE VENDAS (1º PERÍODO)</h1>
						<BsCart className="w-4 h-4" />
					</div>
					<div className="w-full min-h-[400px] lg:min-h-[350px] max-h-[400px] lg:max-h-[350px] flex items-center justify-center p-4">
						<ChartContainer config={firstPeriodChartConfig} className="aspect-auto h-[350px] lg:h-[250px] w-full">
							<ComposedChart
								data={stats?.diario.primeiroPeriodo || []}
								margin={{
									top: 0,
									right: 15,
									left: 15,
									bottom: 0,
								}}
							>
								<defs>
									<linearGradient id="fillFirstSoldValue" x1="0" y1="0" x2="0" y2="1">
										<stop offset="30%" stopColor={firstPeriodChartConfig.totalVendido.color} stopOpacity={0.7} />
										<stop offset="70%" stopColor={firstPeriodChartConfig.totalVendido.color} stopOpacity={0.1} />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="titulo"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									minTickGap={32}
									tickFormatter={(value) => formatDateAsLocale(value) || ""}
									interval="preserveStartEnd" // Mostra primeiro e último valor
									angle={-15} // Rotaciona os labels para melhor legibilidade
									textAnchor="end" // Alinhamento do texto
								/>
								{/* YAxis para valor vendido (área) */}
								<YAxis
									yAxisId="left"
									orientation="left"
									tickFormatter={(value) => `${formatToMoney(value)}`}
									stroke={firstPeriodChartConfig.totalVendido.color}
								/>

								{/* YAxis para quantidade de vendas (barras) */}
								<YAxis yAxisId="right" orientation="right" stroke={firstPeriodChartConfig.qtdeVendas.color} />

								<ChartTooltip
									cursor={false}
									content={
										<ChartTooltipContent
											labelFormatter={(value) => {
												return formatDateAsLocale(value);
											}}
											indicator="dot"
										/>
									}
								/>

								<Bar
									yAxisId="right"
									dataKey="qtdeVendas"
									fill={firstPeriodChartConfig.qtdeVendas.color}
									name={firstPeriodChartConfig.qtdeVendas.label}
									radius={4}
									barSize={20}
								/>

								<Area
									yAxisId="left" // Alterado para left
									dataKey="totalVendido"
									type="monotone"
									fill="url(#fillFirstSoldValue)"
									stroke={firstPeriodChartConfig.totalVendido.color}
									stackId="a"
								/>
							</ComposedChart>
						</ChartContainer>
					</div>
				</div>
				<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary/20 bg-card shadow-2xs overflow-hidden">
					<div className="py-2 px-4 flex items-center justify-between w-full border-b border-primary/10">
						<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">GRÁFICO DE VENDAS (2º PERÍODO)</h1>
						<BsCart className="w-4 h-4" />
					</div>
					<div className="w-full min-h-[400px] lg:min-h-[350px] max-h-[400px] lg:max-h-[350px] flex items-center justify-center p-4">
						<ChartContainer config={secondPeriodChartConfig} className="aspect-auto h-[350px] lg:h-[250px] w-full">
							<ComposedChart
								data={stats?.diario.segundoPeriodo || []}
								margin={{
									top: 0,
									right: 15,
									left: 15,
									bottom: 0,
								}}
							>
								<defs>
									<linearGradient id="fillSecondSoldValue" x1="0" y1="0" x2="0" y2="1">
										<stop offset="30%" stopColor={secondPeriodChartConfig.totalVendido.color} stopOpacity={0.7} />
										<stop offset="70%" stopColor={secondPeriodChartConfig.totalVendido.color} stopOpacity={0.1} />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="titulo"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									minTickGap={32}
									tickFormatter={(value) => formatDateAsLocale(value) || ""}
									interval="preserveStartEnd" // Mostra primeiro e último valor
									angle={-15} // Rotaciona os labels para melhor legibilidade
									textAnchor="end" // Alinhamento do texto
								/>
								{/* YAxis para valor vendido (área) */}
								<YAxis
									yAxisId="left"
									orientation="left"
									tickFormatter={(value) => `${formatToMoney(value)}`}
									stroke={secondPeriodChartConfig.totalVendido.color}
								/>

								{/* YAxis para quantidade de vendas (barras) */}
								<YAxis yAxisId="right" orientation="right" stroke={secondPeriodChartConfig.qtdeVendas.color} />

								<ChartTooltip
									cursor={false}
									content={
										<ChartTooltipContent
											labelFormatter={(value) => {
												return formatDateAsLocale(value);
											}}
											indicator="dot"
										/>
									}
								/>

								<Bar
									yAxisId="right"
									dataKey="qtdeVendas"
									fill={secondPeriodChartConfig.qtdeVendas.color}
									name={secondPeriodChartConfig.qtdeVendas.label}
									radius={4}
									barSize={20}
								/>

								<Area
									yAxisId="left" // Alterado para left
									dataKey="totalVendido"
									type="monotone"
									fill="url(#fillSecondSoldValue)"
									stroke={secondPeriodChartConfig.totalVendido.color}
									stackId="a"
								/>

								<ChartLegend content={<ChartLegendContent payload={{}} />} />
							</ComposedChart>
						</ChartContainer>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col  gap-4 items-center">
				<ResultsBySeller bySellersResult={stats?.porVendedor || []} />
				<ResultsByProduct byProductsResult={stats?.porItem || []} />
			</div>
		</div>
	);
}

type ResultsBySellerProps = {
	bySellersResult: TStatsComparisonOutput["porVendedor"];
};
function ResultsBySeller({ bySellersResult }: ResultsBySellerProps) {
	const [sortingMode, setSortingMode] = useState<"asc-qtdeVendas" | "desc-qtdeVendas" | "asc-totalVendido" | "desc-totalVendido">("desc-qtdeVendas");
	function sortingFunction(a: TStatsComparisonOutput["porVendedor"][number], b: TStatsComparisonOutput["porVendedor"][number]) {
		if (sortingMode === "desc-qtdeVendas") {
			return b.primeiroPeriodo.qtdeVendas - a.primeiroPeriodo.qtdeVendas;
		}
		if (sortingMode === "asc-qtdeVendas") {
			return a.primeiroPeriodo.qtdeVendas - b.primeiroPeriodo.qtdeVendas;
		}
		if (sortingMode === "desc-totalVendido") {
			return b.primeiroPeriodo.totalVendido - a.primeiroPeriodo.totalVendido;
		}
		if (sortingMode === "asc-totalVendido") {
			return a.primeiroPeriodo.totalVendido - b.primeiroPeriodo.totalVendido;
		}
		return 0;
	}
	function SellerCard({ index, seller }: { index: number; seller: TStatsComparisonOutput["porVendedor"][number] }) {
		function getHints(result: TStatsComparisonOutput["porVendedor"][number]) {
			const numberOfSalesProportionFirstToSecond = result.primeiroPeriodo.qtdeVendas / result.segundoPeriodo.qtdeVendas;

			const totalSoldProportionFirstToSecond = result.primeiroPeriodo.totalVendido / result.segundoPeriodo.totalVendido;

			return {
				salesHintDirection: numberOfSalesProportionFirstToSecond > 1 ? "positive" : "negative",
				salesHintText: `Número de Vendas ${numberOfSalesProportionFirstToSecond > 1 ? "aumentou" : "diminuiu"} em ${formatDecimalPlaces(Math.abs(1 - numberOfSalesProportionFirstToSecond) * 100)}%`,
				totalHintDirection: totalSoldProportionFirstToSecond > 1 ? "positive" : "negative",
				totalHintText: `Valor Vendido ${totalSoldProportionFirstToSecond > 1 ? "aumentou" : "diminuiu"} em ${formatDecimalPlaces(Math.abs(1 - totalSoldProportionFirstToSecond) * 100)}%`,
			};
		}
		const { salesHintDirection, salesHintText, totalHintDirection, totalHintText } = getHints(seller);
		return (
			<div
				key={seller.titulo}
				className="w-full flex flex-col gap-3 px-4 py-3 border border-primary/20 bg-card shadow-2xs rounded-xl hover:bg-primary/5 transition-colors"
			>
				{/* Top side - Title and Ranking */}
				<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
					<div className="flex items-center gap-2">
						<div className="rounded-full flex items-center justify-center text-[0.6rem] bg-primary text-primary-foreground font-bold w-6 h-6 min-w-6 min-h-6">
							{index + 1}º
						</div>
						<h1 className="hidden lg:block text-sm tracking-tight font-bold text-primary/80">{seller.titulo.toUpperCase()}</h1>
						<h1 className="block lg:hidden text-xs tracking-tight font-bold text-primary/80">{formatLongString(seller.titulo, 25).toUpperCase()}</h1>
					</div>
					<div className="flex items-center gap-2">
						<div
							className={cn("rounded-md px-2 py-0.5 text-center text-[0.65rem] font-bold uppercase", {
								"bg-green-100 text-green-700": salesHintDirection === "positive",
								"bg-red-100 text-red-700": salesHintDirection === "negative",
							})}
						>
							{salesHintText}
						</div>
						<div
							className={cn("rounded-md px-2 py-0.5 text-center text-[0.65rem] font-bold uppercase", {
								"bg-green-100 text-green-700": totalHintDirection === "positive",
								"bg-red-100 text-red-700": totalHintDirection === "negative",
							})}
						>
							{totalHintText}
						</div>
					</div>
				</div>

				{/* Bottom side - Stats */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
					{/* Sales Count Comparison */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-1.5 opacity-70">
							<ShoppingCart className="w-3.5 h-3.5" />
							<span className="text-[0.6rem] font-bold uppercase tracking-wider">VENDAS</span>
						</div>
						<div className="flex flex-col gap-1.5 w-full">
							{/* First Period */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-1.5 rounded-full bg-primary/5 overflow-hidden">
									<div
										className="h-full bg-[#15599a]"
										style={{
											width: `${(seller.primeiroPeriodo.qtdeVendas / Math.max(seller.primeiroPeriodo.qtdeVendas, seller.segundoPeriodo.qtdeVendas)) * 100}%`,
										}}
									/>
								</div>
								<span className="min-w-[40px] text-right text-xs font-bold">{seller.primeiroPeriodo.qtdeVendas}</span>
							</div>
							{/* Second Period */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-1.5 rounded-full bg-primary/5 overflow-hidden">
									<div
										className="h-full bg-[#FFB900]"
										style={{
											width: `${(seller.segundoPeriodo.qtdeVendas / Math.max(seller.primeiroPeriodo.qtdeVendas, seller.segundoPeriodo.qtdeVendas)) * 100}%`,
										}}
									/>
								</div>
								<span className="min-w-[40px] text-right text-xs font-bold text-[#FFB900]">{seller.segundoPeriodo.qtdeVendas}</span>
							</div>
						</div>
					</div>

					{/* Total Value Comparison */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-1.5 opacity-70">
							<BadgeDollarSign className="w-3.5 h-3.5" />
							<span className="text-[0.6rem] font-bold uppercase tracking-wider">VALOR TOTAL</span>
						</div>
						<div className="flex flex-col gap-1.5 w-full">
							{/* First Period */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-1.5 rounded-full bg-primary/5 overflow-hidden">
									<div
										className="h-full bg-[#15599a]"
										style={{
											width: `${(seller.primeiroPeriodo.totalVendido / Math.max(seller.primeiroPeriodo.totalVendido, seller.segundoPeriodo.totalVendido)) * 100}%`,
										}}
									/>
								</div>
								<span className="min-w-[80px] text-right text-xs font-bold">{formatToMoney(seller.primeiroPeriodo.totalVendido)}</span>
							</div>
							{/* Second Period */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-1.5 rounded-full bg-primary/5 overflow-hidden">
									<div
										className="h-full bg-[#FFB900]"
										style={{
											width: `${(seller.segundoPeriodo.totalVendido / Math.max(seller.primeiroPeriodo.totalVendido, seller.segundoPeriodo.totalVendido)) * 100}%`,
										}}
									/>
								</div>
								<span className="min-w-[80px] text-right text-xs font-bold text-[#FFB900]">{formatToMoney(seller.segundoPeriodo.totalVendido)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col rounded-xl border border-primary/20 bg-card shadow-2xs overflow-hidden">
			<div className="py-2 px-4 flex items-center justify-between w-full border-b border-primary/10">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RESULTADO POR VENDEDORES</h1>
				<UserRound className="w-4 h-4" />
			</div>
			<div className="w-full flex items-center justify-end gap-2 flex-wrap py-1 px-4">
				<button
					type="button"
					onClick={() => setSortingMode("desc-qtdeVendas")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
						"bg-primary/50  text-primary-foreground hover:bg-primary/40": sortingMode === "desc-qtdeVendas",
						"bg-transparent text-primary hover:bg-primary/20": sortingMode !== "desc-qtdeVendas",
					})}
				>
					<ArrowDownNarrowWide size={12} />
					<h1 className="text-[0.65rem] font-medium tracking-tight">ORDEM DECRESCENTE DE VENDAS</h1>
				</button>
				<button
					type="button"
					onClick={() => setSortingMode("asc-qtdeVendas")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
						"bg-primary/50  text-primary-foreground hover:bg-primary/40": sortingMode === "asc-qtdeVendas",
						"bg-transparent text-primary hover:bg-primary/20": sortingMode !== "asc-qtdeVendas",
					})}
				>
					<ArrowDownNarrowWide size={12} />
					<h1 className="text-[0.65rem] font-medium tracking-tight">ORDEM CRESCENTE DE VENDAS</h1>
				</button>
				<button
					type="button"
					onClick={() => setSortingMode("desc-totalVendido")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
						"bg-primary/50  text-primary-foreground hover:bg-primary/40": sortingMode === "desc-totalVendido",
						"bg-transparent text-primary hover:bg-primary/20": sortingMode !== "desc-totalVendido",
					})}
				>
					<ArrowDownNarrowWide size={12} />
					<h1 className="text-[0.65rem] font-medium tracking-tight">ORDEM DECRESCENTE DE VALOR</h1>
				</button>
				<button
					type="button"
					onClick={() => setSortingMode("asc-totalVendido")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
						"bg-primary/50  text-primary-foreground hover:bg-primary/40": sortingMode === "asc-totalVendido",
						"bg-transparent text-primary hover:bg-primary/20": sortingMode !== "asc-totalVendido",
					})}
				>
					<ArrowDownNarrowWide size={12} />
					<h1 className="text-[0.65rem] font-medium tracking-tight">ORDEM CRESCENTE DE VALOR</h1>
				</button>
			</div>
			<div className="w-full min-h-[700px] lg:min-h-[600px] max-h-[700px] lg:max-h-[600px] flex flex-col gap-1 px-2 py-2 overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
				{bySellersResult.sort(sortingFunction).map((seller, index) => (
					<SellerCard key={seller.titulo} index={index} seller={seller} />
				))}
			</div>
		</div>
	);
}

type ResultsByProductProps = {
	byProductsResult: TStatsComparisonOutput["porItem"];
};
function ResultsByProduct({ byProductsResult }: ResultsByProductProps) {
	const [sortingMode, setSortingMode] = useState<"asc-qtdeVendas" | "desc-qtdeVendas" | "asc-totalVendido" | "desc-totalVendido">("desc-qtdeVendas");
	function sortingFunction(a: TStatsComparisonOutput["porItem"][number], b: TStatsComparisonOutput["porItem"][number]) {
		if (sortingMode === "desc-qtdeVendas") {
			return b.primeiroPeriodo.qtdeVendas - a.primeiroPeriodo.qtdeVendas;
		}
		if (sortingMode === "asc-qtdeVendas") {
			return a.primeiroPeriodo.qtdeVendas - b.primeiroPeriodo.qtdeVendas;
		}
		if (sortingMode === "desc-totalVendido") {
			return b.primeiroPeriodo.totalVendido - a.primeiroPeriodo.totalVendido;
		}
		if (sortingMode === "asc-totalVendido") {
			return a.primeiroPeriodo.totalVendido - b.primeiroPeriodo.totalVendido;
		}
		return 0;
	}
	function ProductCard({ index, product }: { index: number; product: TStatsComparisonOutput["porItem"][number] }) {
		function getHints(result: TStatsComparisonOutput["porItem"][number]) {
			const numberOfSalesProportionFirstToSecond = result.primeiroPeriodo.qtdeVendas / result.segundoPeriodo.qtdeVendas;

			const totalSoldProportionFirstToSecond = result.primeiroPeriodo.totalVendido / result.segundoPeriodo.totalVendido;

			return {
				salesHintDirection: numberOfSalesProportionFirstToSecond > 1 ? "positive" : "negative",
				salesHintText: `Número de Vendas ${numberOfSalesProportionFirstToSecond > 1 ? "aumentou" : "diminuiu"} em ${formatDecimalPlaces(Math.abs(1 - numberOfSalesProportionFirstToSecond) * 100)}%`,
				totalHintDirection: totalSoldProportionFirstToSecond > 1 ? "positive" : "negative",
				totalHintText: `Valor Vendido ${totalSoldProportionFirstToSecond > 1 ? "aumentou" : "diminuiu"} em ${formatDecimalPlaces(Math.abs(1 - totalSoldProportionFirstToSecond) * 100)}%`,
			};
		}
		const { salesHintDirection, salesHintText, totalHintDirection, totalHintText } = getHints(product);
		return (
			<div className="w-full flex flex-col gap-3 px-4 py-3 border border-primary/20 bg-card shadow-2xs rounded-xl hover:bg-primary/5 transition-colors">
				{/* Top side - Title and Ranking */}
				<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
					<div className="flex items-center gap-2">
						<div className="rounded-full flex items-center justify-center text-[0.6rem] bg-primary text-primary-foreground font-bold w-6 h-6 min-w-6 min-h-6">
							{index + 1}º
						</div>
						<h1 className="hidden lg:block text-sm tracking-tight font-bold text-primary/80">{product.titulo.toUpperCase()}</h1>
						<h1 className="block lg:hidden text-xs tracking-tight font-bold text-primary/80">{formatLongString(product.titulo, 25).toUpperCase()}</h1>
					</div>
					<div className="flex items-center gap-2">
						<div
							className={cn("rounded-md px-2 py-0.5 text-center text-[0.65rem] font-bold uppercase", {
								"bg-green-100 text-green-700": salesHintDirection === "positive",
								"bg-red-100 text-red-700": salesHintDirection === "negative",
							})}
						>
							{salesHintText}
						</div>
						<div
							className={cn("rounded-md px-2 py-0.5 text-center text-[0.65rem] font-bold uppercase", {
								"bg-green-100 text-green-700": totalHintDirection === "positive",
								"bg-red-100 text-red-700": totalHintDirection === "negative",
							})}
						>
							{totalHintText}
						</div>
					</div>
				</div>

				{/* Bottom side - Stats */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
					{/* Sales Count Comparison */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-1.5 opacity-70">
							<ShoppingCart className="w-3.5 h-3.5" />
							<span className="text-[0.6rem] font-bold uppercase tracking-wider">VENDAS</span>
						</div>
						<div className="flex flex-col gap-1.5 w-full">
							{/* First Period */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-1.5 rounded-full bg-primary/5 overflow-hidden">
									<div
										className="h-full bg-[#15599a]"
										style={{
											width: `${(product.primeiroPeriodo.qtdeVendas / Math.max(product.primeiroPeriodo.qtdeVendas, product.segundoPeriodo.qtdeVendas)) * 100}%`,
										}}
									/>
								</div>
								<span className="min-w-[40px] text-right text-xs font-bold">{product.primeiroPeriodo.qtdeVendas}</span>
							</div>
							{/* Second Period */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-1.5 rounded-full bg-primary/5 overflow-hidden">
									<div
										className="h-full bg-[#FFB900]"
										style={{
											width: `${(product.segundoPeriodo.qtdeVendas / Math.max(product.primeiroPeriodo.qtdeVendas, product.segundoPeriodo.qtdeVendas)) * 100}%`,
										}}
									/>
								</div>
								<span className="min-w-[40px] text-right text-xs font-bold text-[#FFB900]">{product.segundoPeriodo.qtdeVendas}</span>
							</div>
						</div>
					</div>

					{/* Total Value Comparison */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-1.5 opacity-70">
							<BadgeDollarSign className="w-3.5 h-3.5" />
							<span className="text-[0.6rem] font-bold uppercase tracking-wider">VALOR TOTAL</span>
						</div>
						<div className="flex flex-col gap-1.5 w-full">
							{/* First Period */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-1.5 rounded-full bg-primary/5 overflow-hidden">
									<div
										className="h-full bg-[#15599a]"
										style={{
											width: `${(product.primeiroPeriodo.totalVendido / Math.max(product.primeiroPeriodo.totalVendido, product.segundoPeriodo.totalVendido)) * 100}%`,
										}}
									/>
								</div>
								<span className="min-w-[80px] text-right text-xs font-bold">{formatToMoney(product.primeiroPeriodo.totalVendido)}</span>
							</div>
							{/* Second Period */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-1.5 rounded-full bg-primary/5 overflow-hidden">
									<div
										className="h-full bg-[#FFB900]"
										style={{
											width: `${(product.segundoPeriodo.totalVendido / Math.max(product.primeiroPeriodo.totalVendido, product.segundoPeriodo.totalVendido)) * 100}%`,
										}}
									/>
								</div>
								<span className="min-w-[80px] text-right text-xs font-bold text-[#FFB900]">{formatToMoney(product.segundoPeriodo.totalVendido)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col rounded-xl border border-primary/20 bg-card shadow-2xs overflow-hidden">
			<div className="py-2 px-4 flex items-center justify-between w-full border-b border-primary/10">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RESULTADO POR PRODUTOS</h1>
				<Box className="w-4 h-4" />
			</div>
			<div className="w-full flex items-center justify-end gap-2 flex-wrap py-1 px-4">
				<button
					type="button"
					onClick={() => setSortingMode("desc-qtdeVendas")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
						"bg-primary/50  text-primary-foreground hover:bg-primary/40": sortingMode === "desc-qtdeVendas",
						"bg-transparent text-primary hover:bg-primary/20": sortingMode !== "desc-qtdeVendas",
					})}
				>
					<ArrowDownNarrowWide size={12} />
					<h1 className="text-[0.65rem] font-medium tracking-tight">ORDEM DECRESCENTE DE VENDAS</h1>
				</button>
				<button
					type="button"
					onClick={() => setSortingMode("asc-qtdeVendas")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
						"bg-primary/50  text-primary-foreground hover:bg-primary/40": sortingMode === "asc-qtdeVendas",
						"bg-transparent text-primary hover:bg-primary/20": sortingMode !== "asc-qtdeVendas",
					})}
				>
					<ArrowDownNarrowWide size={12} />
					<h1 className="text-[0.65rem] font-medium tracking-tight">ORDEM CRESCENTE DE VENDAS</h1>
				</button>
				<button
					type="button"
					onClick={() => setSortingMode("desc-totalVendido")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
						"bg-primary/50  text-primary-foreground hover:bg-primary/40": sortingMode === "desc-totalVendido",
						"bg-transparent text-primary hover:bg-primary/20": sortingMode !== "desc-totalVendido",
					})}
				>
					<ArrowDownNarrowWide size={12} />
					<h1 className="text-[0.65rem] font-medium tracking-tight">ORDEM DECRESCENTE DE VALOR</h1>
				</button>
				<button
					type="button"
					onClick={() => setSortingMode("asc-totalVendido")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
						"bg-primary/50  text-primary-foreground hover:bg-primary/40": sortingMode === "asc-totalVendido",
						"bg-transparent text-primary hover:bg-primary/20": sortingMode !== "asc-totalVendido",
					})}
				>
					<ArrowDownNarrowWide size={12} />
					<h1 className="text-[0.65rem] font-medium tracking-tight">ORDEM CRESCENTE DE VALOR</h1>
				</button>
			</div>
			<div className="w-full min-h-[700px] lg:min-h-[600px] max-h-[700px] lg:max-h-[600px] flex flex-col gap-1 px-2 py-2 overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
				{byProductsResult.sort(sortingFunction).map((product, index) => (
					<ProductCard key={product.titulo} index={index} product={product} />
				))}
			</div>
		</div>
	);
}
