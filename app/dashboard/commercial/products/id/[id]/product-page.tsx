"use client";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { usePartners } from "@/lib/queries/partners";
import { useProductStats } from "@/lib/queries/products";
import { useSellers } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import { isValidNumber } from "@/lib/validation";
import type { TGetProductStatsOutput } from "@/pages/api/products/stats";
import dayjs from "dayjs";
import {
	BadgeDollarSign,
	Calendar,
	ChartBar,
	CirclePlus,
	Code,
	Package,
	Percent,
	ShoppingBag,
	Tag,
	TrendingUp,
	UserRound,
	Users,
} from "lucide-react";
import { useState } from "react";

type ProductPageProps = {
	user: TAuthUserSession["user"];
	id: string;
};

const SALE_NATURES = ["VENDA", "DEVOLUÇÃO", "BONIFICAÇÃO", "OUTROS"];

export default function ProductPage({ user, id }: ProductPageProps) {
	const {
		data: stats,
		isLoading,
		isError,
		isSuccess,
		error,
		filters,
		updateFilters,
	} = useProductStats({
		productId: id,
		initialFilters: {
			periodAfter: dayjs().startOf("month").toISOString(),
			periodBefore: dayjs().endOf("month").toISOString(),
			sellerId: null,
			partnerId: null,
			saleNatures: null,
		},
	});

	const { data: sellers } = useSellers({ initialFilters: {} });
	const { data: partners } = usePartners({ initialParams: {} });

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<div className="flex items-center gap-2">
					<DateIntervalInput
						label="Período"
						showLabel={false}
						value={{
							after: filters.periodAfter ? new Date(filters.periodAfter) : undefined,
							before: filters.periodBefore ? new Date(filters.periodBefore) : undefined,
						}}
						handleChange={(value) => updateFilters({ periodAfter: value.after?.toISOString(), periodBefore: value.before?.toISOString() })}
					/>
				</div>
			</div>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && stats ? (
				<>
					{/* Product Information Section */}
					<div className="w-full flex flex-col gap-2">
						<div className="flex items-center justify-between gap-2">
							<h1 className="text-lg font-bold tracking-tight">{stats.produto.descricao}</h1>
						</div>
						<div className="flex items-center gap-4 flex-wrap">
							<div className="flex items-center gap-2">
								<Code className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-sm font-medium tracking-tight">
									<span className="text-primary/60">CÓDIGO:</span> {stats.produto.codigo}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Tag className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-sm font-medium tracking-tight">
									<span className="text-primary/60">GRUPO:</span> {stats.produto.grupo}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Package className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-sm font-medium tracking-tight">
									<span className="text-primary/60">UNIDADE:</span> {stats.produto.unidade}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<p className="text-sm font-medium tracking-tight">
									<span className="text-primary/60">NCM:</span> {stats.produto.ncm}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<p className="text-sm font-medium tracking-tight">
									<span className="text-primary/60">TIPO:</span> {stats.produto.tipo}
								</p>
							</div>
						</div>
					</div>

					{/* Main Stats Cards */}
					<div className="w-full flex flex-col gap-2">
						<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
							<StatUnitCard
								title="Quantidade Vendida"
								icon={<ShoppingBag className="w-4 h-4 min-w-4 min-h-4" />}
								current={{ value: stats.quantidadeTotal || 0, format: (n) => formatDecimalPlaces(n) }}
								className="w-full lg:w-1/4"
							/>
							<StatUnitCard
								title="Número de Vendas"
								icon={<CirclePlus className="w-4 h-4 min-w-4 min-h-4" />}
								current={{ value: stats.vendasCount || 0, format: (n) => formatDecimalPlaces(n) }}
								className="w-full lg:w-1/4"
							/>
							<StatUnitCard
								title="Clientes Únicos"
								icon={<Users className="w-4 h-4 min-w-4 min-h-4" />}
								current={{ value: stats.clientesUnicos || 0, format: (n) => formatDecimalPlaces(n) }}
								className="w-full lg:w-1/4"
							/>
							<StatUnitCard
								title="Ticket Médio"
								icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
								current={{ value: stats.ticketMedio || 0, format: (n) => formatToMoney(n) }}
								className="w-full lg:w-1/4"
							/>
						</div>
						<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
							<StatUnitCard
								title="Faturamento Bruto"
								icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
								current={{ value: stats.faturamentoBrutoTotal || 0, format: (n) => formatToMoney(n) }}
								className="w-full lg:w-1/4"
							/>
							<StatUnitCard
								title="Faturamento Líquido"
								icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
								current={{ value: stats.faturamentoLiquidoTotal || 0, format: (n) => formatToMoney(n) }}
								className="w-full lg:w-1/4"
							/>
							<StatUnitCard
								title="Margem Bruta"
								icon={<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />}
								current={{
									value: stats.margemBrutaTotal || 0,
									format: (n) => `${formatToMoney(n)} (${formatDecimalPlaces(stats.margemBrutaPercentual)}%)`,
								}}
								className="w-full lg:w-1/4"
							/>
							<StatUnitCard
								title="Faturamento/Dia"
								icon={<ChartBar className="w-4 h-4 min-w-4 min-h-4" />}
								current={{ value: stats.faturamentoPorDia || 0, format: (n) => formatToMoney(n) }}
								className="w-full lg:w-1/4"
							/>
						</div>
					</div>

					{/* Seasonality Analysis */}
					<div className="flex w-full flex-col lg:flex-row gap-2 items-stretch">
						<div className="w-full lg:w-1/3">
							<GroupedByMonthDay data={stats.resultadosAgrupados.dia} />
						</div>
						<div className="w-full lg:w-1/3">
							<GroupedByMonth data={stats.resultadosAgrupados.mes} />
						</div>
						<div className="w-full lg:w-1/3">
							<GroupedByWeekDay data={stats.resultadosAgrupados.diaSemana} />
						</div>
					</div>

					{/* Relationships Analysis */}
					<div className="flex w-full flex-col lg:flex-row gap-2 items-stretch">
						<div className="w-full lg:w-1/3">
							<GroupedByClient data={stats.resultadosAgrupados.cliente} />
						</div>
						<div className="w-full lg:w-1/3">
							<GroupedBySeller data={stats.resultadosAgrupados.vendedor} />
						</div>
						<div className="w-full lg:w-1/3">
							<GroupedByPartner data={stats.resultadosAgrupados.parceiro} />
						</div>
					</div>

					{/* Advanced Analysis */}
					<div className="flex w-full flex-col lg:flex-row gap-2 items-stretch">
						<div className="w-full lg:w-1/3">
							<GroupedByRelatedProducts data={stats.resultadosAgrupados.produtosRelacionados} />
						</div>
						<div className="w-full lg:w-1/3">
							<MarginAnalysis data={stats.analiseMargem} />
						</div>
						<div className="w-full lg:w-1/3">
							<DiscountAnalysis
								descontoTotal={stats.descontoTotal}
								percentualDescontoMedio={stats.percentualDescontoMedio}
								faturamentoBruto={stats.faturamentoBrutoTotal}
							/>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}

// Seasonality Components
function GroupedByMonthDay({ data }: { data: TGetProductStatsOutput["data"]["resultadosAgrupados"]["dia"] }) {
	const maxValue = Math.max(...data.map((item) => item.total), 0);
	const minValue = Math.min(...data.map((item) => item.total), 0);
	const range = maxValue - minValue;

	const bestDayIndex = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).dia : null;
	const worstDayIndex = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).dia : null;

	function getDayResult(index: number) {
		return data.find((item) => item.dia === index + 1);
	}

	function getColorIntensity(value: number): number {
		if (range === 0) return 0.3;
		const normalized = (value - minValue) / range;
		return 0.1 + normalized * 0.9;
	}

	function DayCard({ index }: { index: number }) {
		const result = getDayResult(index);
		const intensity = result ? getColorIntensity(result.total) : 0;
		const bgColor = result ? `rgba(34, 197, 94, ${intensity})` : "transparent";
		const avgValue = result && result.quantidade > 0 ? result.total / result.quantidade : 0;

		return (
			<Tooltip delayDuration={200}>
				<TooltipTrigger asChild>
					<div
						key={index.toString()}
						className="flex flex-col items-center justify-center p-2 rounded-md border border-primary/20 w-full gap-1 min-h-[60px] transition-all hover:scale-[1.02] cursor-pointer"
						style={{ backgroundColor: bgColor }}
					>
						<h1 className="text-xs font-bold tracking-tight">{index + 1}</h1>
					</div>
				</TooltipTrigger>
				{result ? (
					<TooltipContent className="bg-primary text-primary-foreground p-3 min-w-[180px]">
						<div className="flex flex-col gap-2">
							<h3 className="text-sm font-semibold mb-1">DIA {index + 1}</h3>
							<div className="flex items-center justify-between gap-4">
								<span className="text-xs font-medium tracking-tight">QUANTIDADE</span>
								<span className="text-sm font-bold">{formatDecimalPlaces(result.quantidade)}</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<span className="text-xs font-medium tracking-tight">FATURAMENTO</span>
								<span className="text-sm font-bold">{formatToMoney(result.total)}</span>
							</div>
							<div className="border-t border-primary-foreground/80 mt-1 pt-2 flex flex-col gap-1">
								<div className="flex items-center justify-between gap-4">
									<span className="text-xs font-medium tracking-tight">VALOR MÉDIO</span>
									<span className="text-sm font-bold">{formatToMoney(avgValue)}</span>
								</div>
							</div>
						</div>
					</TooltipContent>
				) : (
					<TooltipContent className="bg-primary text-primary-foreground p-3">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-semibold">DIA {index + 1}</h3>
							<span className="text-xs">SEM DADOS</span>
						</div>
					</TooltipContent>
				)}
			</Tooltip>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">POR DIA DO MÊS</h1>
					<Calendar className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="w-full flex flex-col gap-1">
					{isValidNumber(bestDayIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-green-100 text-green-600 text-xs rounded-lg font-medium">
							Melhor dia para vender foi {bestDayIndex}
						</div>
					) : null}
					{isValidNumber(worstDayIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium">
							Pior dia para vender foi {worstDayIndex}
						</div>
					) : null}
				</div>
				<div className="grid grid-cols-7 gap-2 w-full">
					{Array.from({ length: 31 }).map((_, index) => (
						<DayCard key={index.toString()} index={index} />
					))}
				</div>
			</div>
		</TooltipProvider>
	);
}

function GroupedByMonth({ data }: { data: TGetProductStatsOutput["data"]["resultadosAgrupados"]["mes"] }) {
	const MONTH_MAP = {
		1: "Janeiro",
		2: "Fevereiro",
		3: "Março",
		4: "Abril",
		5: "Maio",
		6: "Junho",
		7: "Julho",
		8: "Agosto",
		9: "Setembro",
		10: "Outubro",
		11: "Novembro",
		12: "Dezembro",
	};

	const maxValue = Math.max(...data.map((item) => item.total), 0);
	const minValue = Math.min(...data.map((item) => item.total), 0);
	const range = maxValue - minValue;

	const bestMonthIndex = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).mes : null;
	const worstMonthIndex = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).mes : null;

	function getMonthResult(index: number) {
		return data.find((item) => item.mes === index + 1);
	}

	function getColorIntensity(value: number): number {
		if (range === 0) return 0.3;
		const normalized = (value - minValue) / range;
		return 0.1 + normalized * 0.9;
	}

	function MonthCard({ index }: { index: number }) {
		const result = getMonthResult(index);
		const intensity = result ? getColorIntensity(result.total) : 0;
		const bgColor = result ? `rgba(34, 197, 94, ${intensity})` : "transparent";
		const avgValue = result && result.quantidade > 0 ? result.total / result.quantidade : 0;

		return (
			<Tooltip delayDuration={200}>
				<TooltipTrigger asChild>
					<div
						key={index.toString()}
						className="flex flex-col items-center justify-center p-3 rounded-md border border-primary/20 w-full gap-1 min-h-[70px] transition-all hover:scale-[1.02] cursor-pointer"
						style={{ backgroundColor: bgColor }}
					>
						<h1 className="text-xs font-bold tracking-tight uppercase">{MONTH_MAP[(index + 1) as keyof typeof MONTH_MAP]}</h1>
					</div>
				</TooltipTrigger>
				{result ? (
					<TooltipContent className="bg-primary text-primary-foreground p-3 min-w-[180px]">
						<div className="flex flex-col gap-2">
							<h3 className="text-sm font-semibold mb-1">{MONTH_MAP[(index + 1) as keyof typeof MONTH_MAP]}</h3>
							<div className="flex items-center justify-between gap-4">
								<span className="text-xs font-medium tracking-tight">QUANTIDADE</span>
								<span className="text-sm font-bold">{formatDecimalPlaces(result.quantidade)}</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<span className="text-xs font-medium tracking-tight">FATURAMENTO</span>
								<span className="text-sm font-bold">{formatToMoney(result.total)}</span>
							</div>
							<div className="border-t border-primary-foreground/80 mt-1 pt-2 flex flex-col gap-1">
								<div className="flex items-center justify-between gap-4">
									<span className="text-xs font-medium tracking-tight">VALOR MÉDIO</span>
									<span className="text-sm font-bold">{formatToMoney(avgValue)}</span>
								</div>
							</div>
						</div>
					</TooltipContent>
				) : (
					<TooltipContent className="bg-primary text-primary-foreground p-3">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-semibold">{MONTH_MAP[(index + 1) as keyof typeof MONTH_MAP]}</h3>
							<span className="text-xs">SEM DADOS</span>
						</div>
					</TooltipContent>
				)}
			</Tooltip>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">POR MÊS</h1>
					<Calendar className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="w-full flex flex-col gap-1">
					{isValidNumber(bestMonthIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-green-100 text-green-600 text-xs rounded-lg font-medium">
							Melhor mês para vender foi {MONTH_MAP[bestMonthIndex as keyof typeof MONTH_MAP]}
						</div>
					) : null}
					{isValidNumber(worstMonthIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium">
							Pior mês para vender foi {MONTH_MAP[worstMonthIndex as keyof typeof MONTH_MAP]}
						</div>
					) : null}
				</div>
				<div className="grid grid-cols-3 grid-rows-4 gap-2 w-full">
					{Array.from({ length: 12 }).map((_, index) => (
						<MonthCard key={index.toString()} index={index} />
					))}
				</div>
			</div>
		</TooltipProvider>
	);
}

function GroupedByWeekDay({ data }: { data: TGetProductStatsOutput["data"]["resultadosAgrupados"]["diaSemana"] }) {
	const WEEKDAY_MAP = {
		0: "Domingo",
		1: "Segunda",
		2: "Terça",
		3: "Quarta",
		4: "Quinta",
		5: "Sexta",
		6: "Sábado",
	};

	const maxValue = Math.max(...data.map((item) => item.total), 0);
	const minValue = Math.min(...data.map((item) => item.total), 0);
	const range = maxValue - minValue;

	const bestDayIndex = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).diaSemana : null;
	const worstDayIndex = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).diaSemana : null;

	function getWeekDayResult(index: number) {
		return data.find((item) => item.diaSemana === index);
	}

	function getColorIntensity(value: number): number {
		if (range === 0) return 0.3;
		const normalized = (value - minValue) / range;
		return 0.1 + normalized * 0.9;
	}

	function WeekDayCard({ index }: { index: number }) {
		const result = getWeekDayResult(index);
		const intensity = result ? getColorIntensity(result.total) : 0;
		const bgColor = result ? `rgba(34, 197, 94, ${intensity})` : "transparent";
		const avgValue = result && result.quantidade > 0 ? result.total / result.quantidade : 0;

		return (
			<Tooltip delayDuration={200}>
				<TooltipTrigger asChild>
					<div
						key={index.toString()}
						className="flex flex-col items-center justify-center p-3 rounded-md border border-primary/20 w-full gap-1 min-h-[70px] transition-all hover:scale-[1.02] cursor-pointer"
						style={{ backgroundColor: bgColor }}
					>
						<h1 className="text-xs font-bold tracking-tight uppercase">{WEEKDAY_MAP[index as keyof typeof WEEKDAY_MAP]}</h1>
					</div>
				</TooltipTrigger>
				{result ? (
					<TooltipContent className="bg-primary text-primary-foreground p-3 min-w-[180px]">
						<div className="flex flex-col gap-2">
							<h3 className="text-sm font-semibold mb-1">{WEEKDAY_MAP[index as keyof typeof WEEKDAY_MAP]}</h3>
							<div className="flex items-center justify-between gap-4">
								<span className="text-xs font-medium tracking-tight">QUANTIDADE</span>
								<span className="text-sm font-bold">{formatDecimalPlaces(result.quantidade)}</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<span className="text-xs font-medium tracking-tight">FATURAMENTO</span>
								<span className="text-sm font-bold">{formatToMoney(result.total)}</span>
							</div>
							<div className="border-t border-primary-foreground/80 mt-1 pt-2 flex flex-col gap-1">
								<div className="flex items-center justify-between gap-4">
									<span className="text-xs font-medium tracking-tight">VALOR MÉDIO</span>
									<span className="text-sm font-bold">{formatToMoney(avgValue)}</span>
								</div>
							</div>
						</div>
					</TooltipContent>
				) : (
					<TooltipContent className="bg-primary text-primary-foreground p-3">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-semibold">{WEEKDAY_MAP[index as keyof typeof WEEKDAY_MAP]}</h3>
							<span className="text-xs">SEM DADOS</span>
						</div>
					</TooltipContent>
				)}
			</Tooltip>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">POR DIA DA SEMANA</h1>
					<Calendar className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="w-full flex flex-col gap-1">
					{isValidNumber(bestDayIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-green-100 text-green-600 text-xs rounded-lg font-medium">
							Melhor dia para vender foi {WEEKDAY_MAP[bestDayIndex as keyof typeof WEEKDAY_MAP]}
						</div>
					) : null}
					{isValidNumber(worstDayIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium">
							Pior dia para vender foi {WEEKDAY_MAP[worstDayIndex as keyof typeof WEEKDAY_MAP]}
						</div>
					) : null}
				</div>
				<div className="grid grid-cols-1 gap-2 w-full">
					{Array.from({ length: 7 }).map((_, index) => (
						<WeekDayCard key={index.toString()} index={index} />
					))}
				</div>
			</div>
		</TooltipProvider>
	);
}

// Relationship Components
function GroupedByClient({ data }: { data: TGetProductStatsOutput["data"]["resultadosAgrupados"]["cliente"] }) {
	const [sortMode, setSortMode] = useState<"value" | "quantity">("value");

	const sortedData = [...data].sort((a, b) => {
		if (sortMode === "value") {
			return b.total - a.total;
		}
		return b.quantidade - a.quantidade;
	});

	function ClientCard({
		index,
		client,
		mode,
	}: {
		index: number;
		client: TGetProductStatsOutput["data"]["resultadosAgrupados"]["cliente"][number];
		mode: "value" | "quantity";
	}) {
		return (
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-1 flex-1 min-w-0">
					<div className="w-6 h-6 min-w-6 min-h-6 rounded-full flex items-center justify-center border border-primary text-xs">{index + 1}º</div>
					<h1 className="text-xs font-medium tracking-tight uppercase truncate">{client.clienteNome || "N/A"}</h1>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold tracking-tight">
						{mode === "value" ? formatToMoney(client.total) : formatDecimalPlaces(client.quantidade)}
					</span>
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">TOP 10 CLIENTES</h1>
					<UserRound className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="flex items-center gap-1 w-full">
					<button
						type="button"
						onClick={() => setSortMode("value")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "value" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						VALOR
					</button>
					<button
						type="button"
						onClick={() => setSortMode("quantity")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "quantity" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						QUANTIDADE
					</button>
				</div>
				<div className="w-full flex flex-col gap-2">
					{sortedData.slice(0, 10).map((item, index) => (
						<ClientCard key={item.clienteId} index={index} client={item} mode={sortMode} />
					))}
				</div>
			</div>
		</TooltipProvider>
	);
}

function GroupedBySeller({ data }: { data: TGetProductStatsOutput["data"]["resultadosAgrupados"]["vendedor"] }) {
	const [sortMode, setSortMode] = useState<"value" | "quantity">("value");

	const sortedData = [...data].sort((a, b) => {
		if (sortMode === "value") {
			return b.total - a.total;
		}
		return b.quantidade - a.quantidade;
	});

	function SellerCard({
		index,
		seller,
		mode,
	}: {
		index: number;
		seller: TGetProductStatsOutput["data"]["resultadosAgrupados"]["vendedor"][number];
		mode: "value" | "quantity";
	}) {
		return (
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-1 flex-1 min-w-0">
					<div className="w-6 h-6 min-w-6 min-h-6 rounded-full flex items-center justify-center border border-primary text-xs">{index + 1}º</div>
					<h1 className="text-xs font-medium tracking-tight uppercase truncate">{seller.vendedorNome || "N/A"}</h1>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold tracking-tight">
						{mode === "value" ? formatToMoney(seller.total) : formatDecimalPlaces(seller.quantidade)}
					</span>
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">TOP 10 VENDEDORES</h1>
					<Users className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="flex items-center gap-1 w-full">
					<button
						type="button"
						onClick={() => setSortMode("value")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "value" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						VALOR
					</button>
					<button
						type="button"
						onClick={() => setSortMode("quantity")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "quantity" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						QUANTIDADE
					</button>
				</div>
				<div className="w-full flex flex-col gap-2">
					{sortedData.slice(0, 10).map((item, index) => (
						<SellerCard key={item.vendedorId} index={index} seller={item} mode={sortMode} />
					))}
				</div>
			</div>
		</TooltipProvider>
	);
}

function GroupedByPartner({ data }: { data: TGetProductStatsOutput["data"]["resultadosAgrupados"]["parceiro"] }) {
	const [sortMode, setSortMode] = useState<"value" | "quantity">("value");

	const sortedData = [...data].sort((a, b) => {
		if (sortMode === "value") {
			return b.total - a.total;
		}
		return b.quantidade - a.quantidade;
	});

	function PartnerCard({
		index,
		partner,
		mode,
	}: {
		index: number;
		partner: TGetProductStatsOutput["data"]["resultadosAgrupados"]["parceiro"][number];
		mode: "value" | "quantity";
	}) {
		return (
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-1 flex-1 min-w-0">
					<div className="w-6 h-6 min-w-6 min-h-6 rounded-full flex items-center justify-center border border-primary text-xs">{index + 1}º</div>
					<h1 className="text-xs font-medium tracking-tight uppercase truncate">{partner.parceiroNome || "N/A"}</h1>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold tracking-tight">
						{mode === "value" ? formatToMoney(partner.total) : formatDecimalPlaces(partner.quantidade)}
					</span>
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">TOP 10 PARCEIROS</h1>
					<Users className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="flex items-center gap-1 w-full">
					<button
						type="button"
						onClick={() => setSortMode("value")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "value" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						VALOR
					</button>
					<button
						type="button"
						onClick={() => setSortMode("quantity")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "quantity" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						QUANTIDADE
					</button>
				</div>
				<div className="w-full flex flex-col gap-2">
					{sortedData.slice(0, 10).map((item, index) => (
						<PartnerCard key={item.parceiroId || index} index={index} partner={item} mode={sortMode} />
					))}
				</div>
			</div>
		</TooltipProvider>
	);
}

// Analysis Components
function GroupedByRelatedProducts({ data }: { data: TGetProductStatsOutput["data"]["resultadosAgrupados"]["produtosRelacionados"] }) {
	const [sortMode, setSortMode] = useState<"frequency" | "value" | "quantity">("frequency");

	const sortedData = [...data].sort((a, b) => {
		if (sortMode === "frequency") {
			return b.frequencia - a.frequencia;
		}
		if (sortMode === "value") {
			return b.total - a.total;
		}
		return b.quantidade - a.quantidade;
	});

	function ProductCard({
		index,
		product,
		mode,
	}: {
		index: number;
		product: TGetProductStatsOutput["data"]["resultadosAgrupados"]["produtosRelacionados"][number];
		mode: "frequency" | "value" | "quantity";
	}) {
		return (
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-1 flex-1 min-w-0">
					<div className="w-6 h-6 min-w-6 min-h-6 rounded-full flex items-center justify-center border border-primary text-xs">{index + 1}º</div>
					<div className="flex flex-col flex-1 min-w-0">
						<h1 className="text-xs font-medium tracking-tight truncate">{product.produtoDescricao}</h1>
						<p className="text-[10px] text-primary/60 truncate">{product.produtoCodigo}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold tracking-tight">
						{mode === "frequency" ? `${product.frequencia}x` : mode === "value" ? formatToMoney(product.total) : formatDecimalPlaces(product.quantidade)}
					</span>
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">PRODUTOS VENDIDOS JUNTO</h1>
					<ShoppingBag className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="flex items-center gap-1 w-full flex-wrap">
					<button
						type="button"
						onClick={() => setSortMode("frequency")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "frequency" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						FREQUÊNCIA
					</button>
					<button
						type="button"
						onClick={() => setSortMode("value")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "value" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						VALOR
					</button>
					<button
						type="button"
						onClick={() => setSortMode("quantity")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							sortMode === "quantity" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						QTDE
					</button>
				</div>
				<div className="w-full flex flex-col gap-2">
					{sortedData.length > 0 ? (
						sortedData.slice(0, 10).map((item, index) => <ProductCard key={item.produtoId} index={index} product={item} mode={sortMode} />)
					) : (
						<p className="text-xs text-center text-primary/60">Nenhum produto relacionado encontrado</p>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}

function MarginAnalysis({ data }: { data: TGetProductStatsOutput["data"]["analiseMargem"] }) {
	const [viewMode, setViewMode] = useState<"seller" | "client" | "partner">("seller");

	const currentData = viewMode === "seller" ? data.porVendedor : viewMode === "client" ? data.porCliente : data.porParceiro;

	function MarginCard({
		index,
		item,
	}: {
		index: number;
		item:
			| TGetProductStatsOutput["data"]["analiseMargem"]["porVendedor"][number]
			| TGetProductStatsOutput["data"]["analiseMargem"]["porCliente"][number]
			| TGetProductStatsOutput["data"]["analiseMargem"]["porParceiro"][number];
	}) {
		const name =
			"vendedorNome" in item ? item.vendedorNome : "clienteNome" in item ? item.clienteNome : "parceiroNome" in item ? item.parceiroNome : "N/A";

		return (
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-1 flex-1 min-w-0">
					<div className="w-6 h-6 min-w-6 min-h-6 rounded-full flex items-center justify-center border border-primary text-xs">{index + 1}º</div>
					<h1 className="text-xs font-medium tracking-tight uppercase truncate">{name || "N/A"}</h1>
				</div>
				<div className="flex flex-col items-end">
					<span className="text-xs font-bold tracking-tight">{formatToMoney(item.margem)}</span>
					<span className="text-[10px] text-primary/60">{formatDecimalPlaces(item.margemPercentual)}%</span>
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">ANÁLISE DE MARGEM</h1>
					<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="flex items-center gap-1 w-full flex-wrap">
					<button
						type="button"
						onClick={() => setViewMode("seller")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							viewMode === "seller" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						VENDEDOR
					</button>
					<button
						type="button"
						onClick={() => setViewMode("client")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							viewMode === "client" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						CLIENTE
					</button>
					<button
						type="button"
						onClick={() => setViewMode("partner")}
						className={`px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors ${
							viewMode === "partner" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
						}`}
					>
						PARCEIRO
					</button>
				</div>
				<div className="w-full flex flex-col gap-2">
					{currentData.length > 0 ? (
						currentData.slice(0, 10).map((item, index) => <MarginCard key={index.toString()} index={index} item={item} />)
					) : (
						<p className="text-xs text-center text-primary/60">Nenhum dado disponível</p>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}

function DiscountAnalysis({
	descontoTotal,
	percentualDescontoMedio,
	faturamentoBruto,
}: {
	descontoTotal: number;
	percentualDescontoMedio: number;
	faturamentoBruto: number;
}) {
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">ANÁLISE DE DESCONTOS</h1>
				<Percent className="w-4 h-4 min-w-4 min-h-4" />
			</div>
			<div className="w-full flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<h3 className="text-sm font-bold tracking-tight">Total em Descontos</h3>
					<p className="text-2xl font-bold text-primary">{formatToMoney(descontoTotal)}</p>
				</div>
				<div className="flex flex-col gap-2">
					<h3 className="text-sm font-bold tracking-tight">Percentual Médio</h3>
					<p className="text-2xl font-bold text-primary">{formatDecimalPlaces(percentualDescontoMedio)}%</p>
				</div>
				<div className="flex flex-col gap-2">
					<h3 className="text-sm font-bold tracking-tight">Impacto no Faturamento</h3>
					<p className="text-sm text-primary/80">
						De <strong>{formatToMoney(faturamentoBruto)}</strong> potenciais, {formatToMoney(descontoTotal)} foram descontados
					</p>
				</div>
				{percentualDescontoMedio > 15 ? (
					<div className="w-full px-3 py-2 bg-yellow-100 text-yellow-800 text-xs rounded-lg">⚠️ Percentual de desconto acima da média (15%)</div>
				) : null}
			</div>
		</div>
	);
}
