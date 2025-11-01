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
				<div className="flex-1 overflow-hidden px-4">
					<ScrollArea className="h-full">
						<StatsPeriodComparisonMenuData />
					</ScrollArea>
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
				<div className="flex-1 overflow-hidden px-4">
					<ScrollArea className="h-full">
						<StatsPeriodComparisonMenuData />
					</ScrollArea>
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
			color: "#fead41",
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
			<div className="w-full flex items-center">
				<Button onClick={() => setShowAdditionalFiltersMenu((prev) => !prev)} variant="ghost" size="xs" className="flex gap-2">
					{!showAdditionalFiltersMenu ? <ChevronDown width={14} height={14} /> : <ChevronUp width={14} height={14} />}
					MOSTRAR FILTROS ADICIONAIS
				</Button>
			</div>
			<AnimatePresence>
				{showAdditionalFiltersMenu ? (
					<>
						<motion.div
							key={"additional-info"}
							variants={SlideMotionVariants}
							initial="initial"
							animate="animate"
							exit="exit"
							className="flex w-full flex-col gap-2 "
						>
							<MultipleSelectInput
								label="VENDEDORES"
								labelClassName="text-[0.6rem]"
								holderClassName="text-xs p-2 min-h-[34px]"
								selected={filters.sellers}
								options={filterOptions?.sellers.map((s, index) => ({ id: index + 1, label: s, value: s })) || []}
								handleChange={(value) =>
									updateFilters({
										sellers: value as string[],
									})
								}
								selectedItemLabel="VENDEDOR"
								onReset={() => updateFilters({ sellers: [] })}
								width="100%"
							/>
							<MultipleSalesSelectInput
								label="VENDAS EXCLUÍDAS"
								labelClassName="text-[0.6rem]"
								holderClassName="text-xs p-2 min-h-[34px]"
								selected={filters.excludedSalesIds}
								handleChange={(value) =>
									updateFilters({
										excludedSalesIds: value as string[],
									})
								}
								selectedItemLabel="VENDAS EXCLUÍDAS"
								onReset={() => updateFilters({ excludedSalesIds: [] })}
								width="100%"
							/>
							<MultipleSelectInput
								label="NATUREZA DA VENDA"
								labelClassName="text-[0.6rem]"
								holderClassName="text-xs p-2 min-h-[34px]"
								selected={filters.saleNatures}
								options={filterOptions?.saleNatures.map((s, index) => ({ id: index + 1, label: s, value: s })) || []}
								handleChange={(value) =>
									updateFilters({
										saleNatures: value as TSale["natureza"][],
									})
								}
								selectedItemLabel="NATUREZA DA VENDA"
								onReset={() => updateFilters({ saleNatures: [] })}
								width="100%"
							/>
							<div className="flex w-full flex-col gap-2">
								<h1 className="w-full text-center text-[0.65rem] tracking-tight text-primary/80">FILTRO POR INTERVALO DE QUANTIDADE</h1>
								<div className="flex w-full flex-col items-center gap-2 lg:flex-row">
									<div className="w-full lg:w-1/2">
										<NumberInput
											label="VALOR > QUE"
											labelClassName="text-[0.6rem]"
											holderClassName="text-xs p-2 min-h-[34px]"
											value={filters.total.min || null}
											handleChange={(value) => updateFilters({ total: { ...filters.total, min: value } })}
											placeholder="Preencha aqui o valor para o filtro de mais quantidade que..."
											width="100%"
										/>
									</div>
									<div className="w-full lg:w-1/2">
										<NumberInput
											label="VALOR < QUE"
											labelClassName="text-[0.6rem]"
											holderClassName="text-xs p-2 min-h-[34px]"
											value={filters.total.max || null}
											handleChange={(value) => updateFilters({ total: { ...filters.total, max: value } })}
											placeholder="Preencha aqui o valor para o filtro de menos quantidade que..."
											width="100%"
										/>
									</div>
								</div>
							</div>
						</motion.div>
					</>
				) : null}
			</AnimatePresence>
			{/** GENERAL STATS */}
			<div className="w-full flex flex-col gap-4">
				<div className="w-full flex flex-col lg:flex-row gap-4 items-center">
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-primary text-primary-foreground">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">FATURAMENTO BRUTO</h1>
							<BsFileEarmarkText className="w-4 h-4 min-w-4 min-h-4" />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#15599a]">{formatToMoney(stats?.faturamentoBruto.primeiroPeriodo || 0)}</h1>
								<h1 className="text-xs text-primary font-medium">1º PERÍODO</h1>
							</div>
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#fead41]">{formatToMoney(stats?.faturamentoBruto.segundoPeriodo || 0)}</h1>
								<h1 className="text-xs text-primary font-medium">2º PERÍODO</h1>
							</div>
						</div>
					</div>
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-primary text-primary-foreground">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">FATURAMENTO LÍQUIDO</h1>
							<BsFileEarmarkText className="w-4 h-4 min-w-4 min-h-4" />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#15599a]">{formatToMoney(stats?.faturamentoLiquido.primeiroPeriodo || 0)}</h1>
								<h1 className="text-xs text-primary font-medium">1º PERÍODO</h1>
							</div>
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#fead41]">{formatToMoney(stats?.faturamentoLiquido.segundoPeriodo || 0)}</h1>
								<h1 className="text-xs text-primary font-medium">2º PERÍODO</h1>
							</div>
						</div>
					</div>
				</div>
				<div className="w-full flex flex-col lg:flex-row gap-4 items-center">
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-primary text-primary-foreground">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Número de Vendas</h1>
							<VscDiffAdded className="w-4 h-4 min-w-4 min-h-4" />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#15599a]">{stats?.qtdeVendas.primeiroPeriodo}</h1>
								<h1 className="text-xs text-primary font-medium">1º PERÍODO</h1>
							</div>
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#fead41]">{stats?.qtdeVendas.segundoPeriodo}</h1>
								<h1 className="text-xs text-primary font-medium">2º PERÍODO</h1>
							</div>
						</div>
					</div>
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-primary text-primary-foreground">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">TICKET MÉDIO</h1>
							<BsTicketPerforated className="w-4 h-4 min-w-4 min-h-4" />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#15599a]">{formatToMoney(stats?.ticketMedio.primeiroPeriodo || 0)}</h1>
								<h1 className="text-xs text-primary font-medium">1º PERÍODO</h1>
							</div>
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#fead41]">{formatToMoney(stats?.ticketMedio.segundoPeriodo || 0)}</h1>
								<h1 className="text-xs text-primary font-medium">2º PERÍODO</h1>
							</div>
						</div>
					</div>
				</div>
				<div className="w-full flex flex-col lg:flex-row gap-4 items-center">
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-primary text-primary-foreground">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">VALOR DIÁRIO</h1>
							<BsCart className="w-4 h-4 min-w-4 min-h-4" />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#15599a]">{formatToMoney(stats?.valorDiarioVendido.primeiroPeriodo || 0)}</h1>
								<h1 className="text-xs text-primary font-medium">1º PERÍODO</h1>
							</div>
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#fead41]">{formatToMoney(stats?.valorDiarioVendido.segundoPeriodo || 0)}</h1>
								<h1 className="text-xs text-primary font-medium">2º PERÍODO</h1>
							</div>
						</div>
					</div>
					<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-primary text-primary-foreground">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">MÉDIA DE ITENS POR VENDA</h1>
							<ShoppingBag className="w-4 h-4 min-w-4 min-h-4" />
						</div>
						<div className="px-6 py-2 flex w-full flex-col">
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#15599a]">{formatDecimalPlaces(stats?.itensPorVendaMedio.primeiroPeriodo || 0, 1, 1)}</h1>
								<h1 className="text-xs text-primary font-medium">1º PERÍODO</h1>
							</div>
							<div className="w-full flex items-center justify-between gap-2">
								<h1 className="text-sm font-black text-[#fead41]">{formatDecimalPlaces(stats?.itensPorVendaMedio.segundoPeriodo || 0, 1, 1)}</h1>
								<h1 className="text-xs text-primary font-medium">2º PERÍODO</h1>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col lg:flex-row gap-4 items-center">
				<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
					<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
						<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">GRÁFICO DE VENDAS DO PRIMEIRO PERÍODO</h1>
						<BsCart className="w-4 h-4 min-w-4 min-h-4" />
					</div>
					<div className="w-full min-h-[400px] lg:min-h-[350px] max-h-[400px] lg:max-h-[350px] flex items-center justify-center">
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
				<div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
					<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41] text-white">
						<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">GRÁFICO DE VENDAS DO SEGUNDO PERÍODO</h1>
						<BsCart className="w-4 h-4 min-w-4 min-h-4" />
					</div>
					<div className="w-full min-h-[400px] lg:min-h-[350px] max-h-[400px] lg:max-h-[350px] flex items-center justify-center">
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

								<ChartLegend content={<ChartLegendContent />} />
							</ComposedChart>
						</ChartContainer>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col  gap-4 items-center">
				<ResultsBySeller bySellersResult={stats?.porVendedor || []} />
				<ResultsByProduct byProductsResult={stats?.porItem || []} />
				{/* <div className="flex w-full lg:w-1/2 flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
					<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41] text-white">
						<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RESULTADO POR PRODUTO</h1>
						<Box className="w-4 h-4 min-w-4 min-h-4" />
					</div>
					<div className="w-full min-h-[400px] lg:min-h-[350px] max-h-[400px] lg:max-h-[350px] flex items-center justify-center">
						<ChartContainer config={productsChartConfig} className="aspect-auto h-[350px] lg:h-[250px] w-full">
							<BarChart
								data={stats?.porItem || []}
								margin={{
									top: 0,
									right: 15,
									left: 15,
									bottom: 0,
								}}
							>
								<XAxis type="number" dataKey="primeiroPeriodo.totalVendido" hide />
								<YAxis dataKey="titulo" type="category" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} />
								<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
								<Bar dataKey="primeiroPeriodo.totalVendido" fill={productsChartConfig["primeiroPeriodo.totalVendido"].color} radius={5} />
							</BarChart>
						</ChartContainer>
					</div>
				</div> */}
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
				className="w-full flex flex-col gap-2 px-3 py-2 border border-primary/30 shadow-sm rounded-lg hover:bg-gray-50 transition-colors"
			>
				{/* Left side - Title and Ranking */}
				<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
					<div className="flex items-center gap-2">
						<div className="rounded-full p-1 flex items-center justify-center text-[0.55rem] bg-primary text-primary-foreground font-bold w-6 h-6 min-w-6 min-h-6">
							{index + 1}º
						</div>
						<h1 className="hidden lg:block text-[0.7rem] lg:text-sm tracking-tight font-medium">{seller.titulo.toUpperCase()}</h1>
						<h1 className="block lg:hidden text-[0.7rem] lg:text-sm tracking-tight font-medium">{formatLongString(seller.titulo, 25).toUpperCase()}</h1>
					</div>
					<div className="flex items-center gap-2">
						<h1
							className={cn("rounded-lg bg-secondary px-2 py-0.5 text-center text-[0.6rem] font-bold italic text-primary/80", {
								"bg-green-100 text-green-800": salesHintDirection === "positive",
								"bg-red-100 text-red-800": salesHintDirection === "negative",
							})}
						>
							{salesHintText}
						</h1>
						<h1
							className={cn("rounded-lg bg-secondary px-2 py-0.5 text-center text-[0.6rem] font-bold italic text-primary/80", {
								"bg-green-100 text-green-800": totalHintDirection === "positive",
								"bg-red-100 text-red-800": totalHintDirection === "negative",
							})}
						>
							{totalHintText}
						</h1>
					</div>
				</div>

				{/* Right side - Stats */}
				<div className="flex items-start gap-4 w-full">
					{/* Sales Count Comparison */}
					<div className="flex flex-col gap-1 w-1/2">
						<div className="flex items-center gap-1 mb-1">
							<ShoppingCart className="w-4 h-4" />
							<span className="text-[0.65rem] font-medium text-gray-600">VENDAS</span>
						</div>
						<div className="flex flex-col gap-1 w-full">
							{/* First Period */}
							<div className="flex items-center gap-2 grow">
								<div className="grow h-2 rounded-full bg-gray-100">
									<div
										className="h-full bg-[#15599a] rounded-full"
										style={{
											width: `${(seller.primeiroPeriodo.qtdeVendas / Math.max(seller.primeiroPeriodo.qtdeVendas, seller.segundoPeriodo.qtdeVendas)) * 100}%`,
										}}
									/>
								</div>
								<span className="w-fit text-[0.7rem] font-bold text-[#15599a]">{seller.primeiroPeriodo.qtdeVendas}</span>
							</div>
							{/* Second Period */}
							<div className="flex items-center gap-2 grow">
								<div className="grow h-2 rounded-full bg-gray-100">
									<div
										className="h-full bg-[#fead41] rounded-full"
										style={{
											width: `${(seller.segundoPeriodo.qtdeVendas / Math.max(seller.primeiroPeriodo.qtdeVendas, seller.segundoPeriodo.qtdeVendas)) * 100}%`,
										}}
									/>
								</div>
								<span className="text-[0.7rem] w-fit font-bold text-[#fead41]">{seller.segundoPeriodo.qtdeVendas}</span>
							</div>
							{/* <div
										className={`flex-0 text-[0.65rem] font-medium ${
											seller.segundoPeriodo.totalVendido > seller.primeiroPeriodo.totalVendido ? "text-green-600" : "text-red-600"
										}`}
									>
										{(((seller.segundoPeriodo.totalVendido - seller.primeiroPeriodo.totalVendido) / seller.primeiroPeriodo.totalVendido) * 100).toFixed(1)}%
									</div> */}
						</div>
					</div>

					{/* Total Value Comparison */}
					<div className="flex flex-col gap-1 w-1/2">
						<div className="flex items-center gap-1 mb-1">
							<BadgeDollarSign className="w-4 h-4" />
							<span className="text-[0.65rem] font-medium text-gray-600">VALOR</span>
						</div>
						<div className="flex flex-col gap-1 w-full">
							{/* First Period */}
							<div className="flex items-center gap-2 grow">
								<div className="grow h-2 rounded-full bg-gray-100">
									<div
										className="h-full bg-[#15599a] rounded-full"
										style={{
											width: `${(seller.primeiroPeriodo.totalVendido / Math.max(seller.primeiroPeriodo.totalVendido, seller.segundoPeriodo.totalVendido)) * 100}%`,
										}}
									/>
								</div>
								<span className="w-fit text-[0.7rem] font-bold text-[#15599a]">{formatToMoney(seller.primeiroPeriodo.totalVendido)}</span>
							</div>
							{/* Second Period */}
							<div className="flex items-center gap-2 grow">
								<div className="grow h-2 rounded-full bg-gray-100">
									<div
										className="h-full bg-[#fead41] rounded-full"
										style={{
											width: `${(seller.segundoPeriodo.totalVendido / Math.max(seller.primeiroPeriodo.totalVendido, seller.segundoPeriodo.totalVendido)) * 100}%`,
										}}
									/>
								</div>
								<span className="text-[0.7rem] w-fit font-bold text-[#fead41]">{formatToMoney(seller.segundoPeriodo.totalVendido)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
			<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RESULTADO POR VENDEDORES</h1>
				<UserRound className="w-4 h-4 min-w-4 min-h-4" />
			</div>
			<div className="w-full flex items-center justify-end gap-2 flex-wrap py-1 px-4">
				<button
					type="button"
					onClick={() => setSortingMode("desc-qtdeVendas")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-black duration-300 ease-in-out", {
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
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-black duration-300 ease-in-out", {
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
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-black duration-300 ease-in-out", {
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
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-black duration-300 ease-in-out", {
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
			<div className="w-full flex flex-col gap-2 px-3 py-2 border border-primary/30 shadow-sm rounded-lg hover:bg-gray-50 transition-colors">
				{/* Left side - Title and Ranking */}
				<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
					<div className="flex items-center gap-2">
						<div className="rounded-full p-1 flex items-center justify-center text-[0.55rem] bg-primary text-primary-foreground font-bold w-6 h-6 min-w-6 min-h-6">
							{index + 1}º
						</div>
						<h1 className="hidden lg:block text-[0.7rem] lg:text-sm tracking-tight font-medium">{product.titulo.toUpperCase()}</h1>
						<h1 className="block lg:hidden text-[0.7rem] lg:text-sm tracking-tight font-medium">{formatLongString(product.titulo, 25).toUpperCase()}</h1>
					</div>
					<div className="flex items-center gap-2">
						<h1
							className={cn("rounded-lg bg-secondary px-2 py-0.5 text-center text-[0.6rem] font-bold italic text-primary/80", {
								"bg-green-100 text-green-800": salesHintDirection === "positive",
								"bg-red-100 text-red-800": salesHintDirection === "negative",
							})}
						>
							{salesHintText}
						</h1>
						<h1
							className={cn("rounded-lg bg-secondary px-2 py-0.5 text-center text-[0.6rem] font-bold italic text-primary/80", {
								"bg-green-100 text-green-800": totalHintDirection === "positive",
								"bg-red-100 text-red-800": totalHintDirection === "negative",
							})}
						>
							{totalHintText}
						</h1>
					</div>
				</div>

				{/* Right side - Stats */}
				<div className="flex items-start gap-4 w-full">
					{/* Sales Count Comparison */}
					<div className="flex flex-col gap-1 w-1/2">
						<div className="flex items-center gap-1 mb-1">
							<ShoppingCart className="w-4 h-4" />
							<span className="text-[0.65rem] font-medium text-gray-600">VENDAS</span>
						</div>
						<div className="flex flex-col gap-1 w-full">
							{/* First Period */}
							<div className="flex items-center gap-2 grow">
								<div className="grow h-2 rounded-full bg-gray-100">
									<div
										className="h-full bg-[#15599a] rounded-full"
										style={{
											width: `${(product.primeiroPeriodo.qtdeVendas / Math.max(product.primeiroPeriodo.qtdeVendas, product.segundoPeriodo.qtdeVendas)) * 100}%`,
										}}
									/>
								</div>
								<span className="w-fit text-[0.7rem] font-bold text-[#15599a]">{product.primeiroPeriodo.qtdeVendas}</span>
							</div>
							{/* Second Period */}
							<div className="flex items-center gap-2 grow">
								<div className="grow h-2 rounded-full bg-gray-100">
									<div
										className="h-full bg-[#fead41] rounded-full"
										style={{
											width: `${(product.segundoPeriodo.qtdeVendas / Math.max(product.primeiroPeriodo.qtdeVendas, product.segundoPeriodo.qtdeVendas)) * 100}%`,
										}}
									/>
								</div>
								<span className="text-[0.7rem] w-fit font-bold text-[#fead41]">{product.segundoPeriodo.qtdeVendas}</span>
							</div>
							{/* <div
										className={`flex-0 text-[0.65rem] font-medium ${
											seller.segundoPeriodo.totalVendido > seller.primeiroPeriodo.totalVendido ? "text-green-600" : "text-red-600"
										}`}
									>
										{(((seller.segundoPeriodo.totalVendido - seller.primeiroPeriodo.totalVendido) / seller.primeiroPeriodo.totalVendido) * 100).toFixed(1)}%
									</div> */}
						</div>
					</div>

					{/* Total Value Comparison */}
					<div className="flex flex-col gap-1 w-1/2">
						<div className="flex items-center gap-1 mb-1">
							<BadgeDollarSign className="w-4 h-4" />
							<span className="text-[0.65rem] font-medium text-gray-600">VALOR</span>
						</div>
						<div className="flex flex-col gap-1 w-full">
							{/* First Period */}
							<div className="flex items-center gap-2 grow">
								<div className="grow h-2 rounded-full bg-gray-100">
									<div
										className="h-full bg-[#15599a] rounded-full"
										style={{
											width: `${(product.primeiroPeriodo.totalVendido / Math.max(product.primeiroPeriodo.totalVendido, product.segundoPeriodo.totalVendido)) * 100}%`,
										}}
									/>
								</div>
								<span className="w-fit text-[0.7rem] font-bold text-[#15599a]">{formatToMoney(product.primeiroPeriodo.totalVendido)}</span>
							</div>
							{/* Second Period */}
							<div className="flex items-center gap-2 grow">
								<div className="grow h-2 rounded-full bg-gray-100">
									<div
										className="h-full bg-[#fead41] rounded-full"
										style={{
											width: `${(product.segundoPeriodo.totalVendido / Math.max(product.primeiroPeriodo.totalVendido, product.segundoPeriodo.totalVendido)) * 100}%`,
										}}
									/>
								</div>
								<span className="text-[0.7rem] w-fit font-bold text-[#fead41]">{formatToMoney(product.segundoPeriodo.totalVendido)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
			<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RESULTADO POR PRODUTOS</h1>
				<Box className="w-4 h-4 min-w-4 min-h-4" />
			</div>
			<div className="w-full flex items-center justify-end gap-2 flex-wrap py-1 px-4">
				<button
					type="button"
					onClick={() => setSortingMode("desc-qtdeVendas")}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-black duration-300 ease-in-out", {
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
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-black duration-300 ease-in-out", {
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
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-black duration-300 ease-in-out", {
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
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-black duration-300 ease-in-out", {
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
