import { formatDateAsLocale, formatDecimalPlaces, formatLongString } from "@/lib/formatting";
import { formatToMoney } from "@/lib/formatting";
import { useGroupedSalesStats } from "@/lib/queries/stats/grouped";
import type { TGroupedSalesStats } from "@/pages/api/stats/sales-grouped";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import { useEffect, useMemo, useState } from "react";
import { BsCart } from "react-icons/bs";
import { useDebounce } from "use-debounce";

import { Button } from "@/components/ui/button";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { getExcelFromJSON } from "@/lib/excel-utils";
import { isValidNumber } from "@/lib/validation";
import { BadgeDollarSign, Calendar, CirclePlus, Download } from "lucide-react";
import { FaRankingStar } from "react-icons/fa6";
import { VariableSizeList as List, VariableSizeList } from "react-window";
import { Bar, BarChart, LabelList, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
type GroupedStatsBlockProps = {
	generalQueryParams: TSaleStatsGeneralQueryParams;
	user: TAuthUserSession["user"];
};
function GroupedStatsBlock({ generalQueryParams, user }: GroupedStatsBlockProps) {
	const [queryParams, setQueryParams] = useState<TSaleStatsGeneralQueryParams>(generalQueryParams);

	const [debouncedQueryParams] = useDebounce(queryParams, 1000);

	const { data: groupedStats, isLoading: groupedStatsLoading } = useGroupedSalesStats(debouncedQueryParams);

	useEffect(() => {
		setQueryParams(generalQueryParams);
	}, [generalQueryParams]);
	return (
		<div className="w-full flex flex-col gap-2 py-2">
			<ResultsBySellerGraph data={groupedStats?.porVendedor || []} />
			<ResultsByPartnerGraph data={groupedStats?.porParceiro || []} />
			<div className="w-full flex flex-col items-center gap-2 lg:flex-row">
				<div className="w-full lg:w-[50%]">
					<ResultsByItemGraph data={groupedStats?.porItem || []} />
				</div>
				<div className="w-full lg:w-[50%]">
					<ResultsByProductGroupGraph data={groupedStats?.porGrupo || []} />
				</div>
			</div>
			<div className="flex w-full flex-col lg:flex-row gap-2 items-stretch">
				<div className="w-full lg:w-1/3">
					<GroupedByMonthDay data={groupedStats?.porDiaDoMes || []} />
				</div>
				<div className="w-full lg:w-1/3">
					<GroupedByMonth data={groupedStats?.porMes || []} />
				</div>
				<div className="w-full lg:w-1/3">
					<GroupedByWeekDay data={groupedStats?.porDiaDaSemana || []} />
				</div>
			</div>
		</div>
	);
}

export default GroupedStatsBlock;

/// [TODO   ] VIRTUALIZE LIST OF PRODUCTS
function ResultsByItemGraph({ data }: { data: TGroupedSalesStats["porItem"] }) {
	const [type, setType] = useState<"qtde" | "total">("total");
	const dataSorted = data.sort((a, b) => (type === "total" ? b.total - a.total : b.qtde - a.qtde));

	async function handleExportData(data: TGroupedSalesStats["porItem"] | undefined) {
		try {
			if (!data) throw new Error("Não há dados para exportar");
			const exportationJSON = data.map((item) => ({
				ITEM: item.titulo,
				"VALOR VENDIDO": item.total,
				"Nº DE VENDAS": item.qtde,
			}));
			getExcelFromJSON(exportationJSON, "RESULTADOS_POR_ITEM.xlsx");
			return toast.success("Dados exportados com sucesso");
		} catch (error) {
			const msg = getErrorMessage(error);
			return toast.error(msg);
		}
	}
	const ProductsList = ({
		height,
		width,
		list,
	}: {
		height: number | string;
		width: number | string;
		list: TGroupedSalesStats["porItem"];
	}) => (
		<VariableSizeList
			height={height}
			width={width}
			itemCount={list ? list.length : 0}
			itemSize={(index) => 30} // Adjust the item height as needed
			className="overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30"
		>
			{({ index, style }) => (
				<div style={style} key={`${type}-${index}`} className="w-full flex items-center justify-between gap-2 px-2">
					<div className="flex items-center gap-1">
						<div className="w-6 h-6 rounded-full flex items-center justify-center border border-primary">
							<BsCart size={10} />
						</div>
						<h1 className="rounded-full p-1 text-[0.55rem] bg-[#15599a] text-white font-bold">{index + 1}º</h1>
						<h1 className="hidden lg:block text-[0.6rem] lg:text-xs tracking-tight font-medium">{list[index].titulo}</h1>
						<h1 className="block lg:hidden text-[0.6rem] lg:text-xs tracking-tight font-medium">{formatLongString(list[index].titulo, 25)}</h1>
					</div>
					<h1 className="text-xs lg:text-base font-black">
						{type === "total" ? formatToMoney(list[index].total) : formatDecimalPlaces(list[index].qtde)}
					</h1>
				</div>
			)}
		</VariableSizeList>
	);

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">PARTICIPAÇÃO POR ITEM</h1>
				<div className="flex items-center gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={"ghost"} size="fit" className="rounded-lg p-2" onClick={() => handleExportData(data)}>
									<Download className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Baixar</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={type === "total" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setType("total")}>
									<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Valor Vendido</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={type === "qtde" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setType("qtde")}>
									<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Quantidade de Vendas</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
			<div className="px-6 py-2 flex w-full flex-col gap-2 h-[300px] lg:h-[350px] max-h-[300px] lg:max-h-[350px] items-center justify-center overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
				<ProductsList height={330} width={"100%"} list={dataSorted} />
			</div>
		</div>
	);
}

function ResultsByProductGroupGraph({ data }: { data: TGroupedSalesStats["porGrupo"] }) {
	const [type, setType] = useState<"qtde" | "total">("total");

	async function handleExportData(data: TGroupedSalesStats["porGrupo"] | undefined) {
		try {
			if (!data) throw new Error("Não há dados para exportar");
			const exportationJSON = data.map((item) => ({
				GRUPO: item.titulo,
				"VALOR VENDIDO": item.total,
				"Nº DE VENDAS": item.qtde,
			}));
			getExcelFromJSON(exportationJSON, "RESULTADOS_POR_GRUPO.xlsx");
			return toast.success("Dados exportados com sucesso");
		} catch (error) {
			const msg = getErrorMessage(error);
			return toast.error(msg);
		}
	}
	const Collors = ["#15599a", "#fead41", "#ff595e", "#8ac926", "#6a4c93", "#5adbff"];
	const total = useMemo(() => data.reduce((acc, current) => (type === "total" ? acc + current.total : acc + current.qtde), 0), [data, type]);
	const graphData = useMemo(
		() =>
			data
				.filter((d) => d.qtde > 100)
				.sort((a, b) => b.qtde - a.qtde)
				.map((p, index) => ({ ...p, fill: Collors[index] || "#000" })),
		[data],
	);
	const projectTypesChartConfig = { titulo: { label: "GRUPO" } };
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">PARTICIPAÇÃO POR GRUPO</h1>
				<div className="flex items-center gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={"ghost"} size="fit" className="rounded-lg p-2" onClick={() => handleExportData(data)}>
									<Download className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Baixar</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={type === "total" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setType("total")}>
									<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Valor Vendido</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={type === "qtde" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setType("qtde")}>
									<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Quantidade de Vendas</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
			<div className="px-6 py-2 flex w-full flex-col gap-2 h-[300px] lg:h-[350px] max-h-[300px] lg:max-h-[350px] items-center justify-center">
				<ChartContainer config={projectTypesChartConfig} className="h-[250px] w-[250px]">
					<PieChart>
						<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={graphData}
							dataKey={type}
							nameKey="titulo"
							label={(x) => {
								return `${formatDecimalPlaces((100 * (x.value as number)) / total)}%`;
							}}
							innerRadius={60}
							strokeWidth={2}
						/>
						<ChartLegend
							content={<ChartLegendContent payload={graphData} verticalAlign="bottom" />}
							className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
						/>
					</PieChart>
				</ChartContainer>
			</div>
		</div>
	);
}

function ResultsBySellerGraph({ data }: { data: TGroupedSalesStats["porVendedor"] }) {
	const [type, setType] = useState<"qtde" | "total">("total");

	console.log("ResultsBySellerGraph data", data);
	const dataSorted = useMemo(() => [...data].sort((a, b) => (type === "total" ? b.total - a.total : b.qtde - a.qtde)), [data, type]);

	async function handleExportData(data: TGroupedSalesStats["porVendedor"] | undefined) {
		try {
			if (!data) throw new Error("Não há dados para exportar");
			const exportationJSON = data.map((item) => ({
				"NOME DO VENDEDOR": item.titulo,
				"VALOR VENDIDO": item.total,
				"Nº DE VENDAS": item.qtde,
			}));
			getExcelFromJSON(exportationJSON, "RESULTADOS_POR_VENDEDOR.xlsx");
			return toast.success("Dados exportados com sucesso");
		} catch (error) {
			const msg = getErrorMessage(error);
			return toast.error(msg);
		}
	}
	const chartConfig = {
		total: {
			label: "Valor Vendido",
			color: "#fead41",
		},
		qtde: {
			label: "Qtde Vendas",
			color: "#fead41",
		},
	} satisfies ChartConfig;
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">RANKING DE VENDEDORES</h1>
				<div className="flex items-center gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={"ghost"} size="fit" className="rounded-lg p-2" onClick={() => handleExportData(data)}>
									<Download className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Baixar</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={type === "total" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setType("total")}>
									<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Valor Vendido</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={type === "qtde" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setType("qtde")}>
									<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Quantidade de Vendas</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			<div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] :max-h-[450px]">
				<div className="flex max-h-[400px] min-h-[400px] w-full items-center justify-center lg:max-h-[350px] lg:min-h-[350px] overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
					<ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full lg:h-[250px]">
						<BarChart
							margin={{
								left: 40,
								right: 25,
							}}
							accessibilityLayer
							data={dataSorted}
							layout="vertical"
						>
							<XAxis type="number" dataKey={type} hide />
							<YAxis dataKey="titulo" type="category" tickLine={false} tickMargin={0} axisLine={false} tickFormatter={(value) => value.slice(0, 36)} />
							<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
							<Bar dataKey={type} fill="#15599a" radius={5}>
								<LabelList
									dataKey={type}
									position="right"
									offset={8}
									className="fill-foreground text-[0.5rem]"
									formatter={(value: any) => (type === "total" ? formatToMoney(value) : value)}
								/>
							</Bar>
						</BarChart>
					</ChartContainer>
				</div>
			</div>
		</div>
	);
}
function ResultsByPartnerGraph({ data }: { data: TGroupedSalesStats["porParceiro"] }) {
	const [type, setType] = useState<"qtde" | "total">("total");

	async function handleExportData(data: TGroupedSalesStats["porParceiro"] | undefined) {
		try {
			if (!data) throw new Error("Não há dados para exportar");
			const exportationJSON = data.map((item) => ({
				"CPF-CPNJ DO PARCEIRO": item.titulo,
				"VALOR VENDIDO": item.total,
				"Nº DE VENDAS": item.qtde,
				"ÚLTIMA COMPRA": item.ultimaCompra ? formatDateAsLocale(item.ultimaCompra) : "N/A",
				"VENDEDOR MAIS FREQUENTE": item.vendedorMaisFrequente,
				"DATA DE CADASTRO": item.tempoAtividade ? formatDateAsLocale(item.tempoAtividade) : "N/A",
			}));
			getExcelFromJSON(exportationJSON, "RESULTADOS_POR_PARCEIRO.xlsx");
			return toast.success("Dados exportados com sucesso");
		} catch (error) {
			const msg = getErrorMessage(error);
			return toast.error(msg);
		}
	}
	const dataSorted = useMemo(() => [...data].sort((a, b) => (type === "total" ? b.total - a.total : b.qtde - a.qtde)), [data, type]);
	const chartConfig = {
		total: {
			label: "Valor Vendido",
			color: "#fead41",
		},
		qtde: {
			label: "Qtde Vendas",
			color: "#fead41",
		},
	} satisfies ChartConfig;
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">RANKING DE PARCEIROS</h1>
				<div className="flex items-center gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={"ghost"} size="fit" className="rounded-lg p-2" onClick={() => handleExportData(data)}>
									<Download className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Baixar</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={type === "total" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setType("total")}>
									<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Valor Vendido</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={type === "qtde" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setType("qtde")}>
									<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Quantidade de Vendas</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			<div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] :max-h-[450px]">
				<div className="flex max-h-[400px] min-h-[400px] w-full items-center justify-center lg:max-h-[350px] lg:min-h-[350px]">
					<ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full lg:h-[250px]">
						<BarChart
							margin={{
								left: 40,
								right: 25,
							}}
							accessibilityLayer
							data={dataSorted}
							layout="vertical"
						>
							<XAxis type="number" dataKey={type} hide />
							<YAxis dataKey="titulo" type="category" tickLine={false} tickMargin={0} axisLine={false} tickFormatter={(value) => value.slice(0, 36)} />
							<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
							<Bar dataKey={type} fill="#15599a" radius={5}>
								<LabelList
									dataKey={type}
									position="right"
									offset={8}
									className="fill-foreground text-[0.5rem]"
									formatter={(value: any) => (type === "total" ? formatToMoney(value) : value)}
								/>
							</Bar>
						</BarChart>
					</ChartContainer>
				</div>
			</div>
		</div>
	);
}

function GroupedByMonthDay({ data }: { data: TGroupedSalesStats["porDiaDoMes"] }) {
	console.log("DATA ON BY MONTH DAY: ", data);
	// Calculate color intensity based on performance ranking
	const maxValue = Math.max(...data.map((item) => item.total), 0);
	const minValue = Math.min(...data.map((item) => item.total), 0);
	const range = maxValue - minValue;

	const bestDayIndex = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).dia : null;
	const worstDayIndex = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).dia : null;

	function getDayResult(index: number) {
		return data.find((item) => Number(item.dia) === index + 1);
	}

	function getColorIntensity(value: number): number {
		if (range === 0) return 0.3;
		const normalized = (value - minValue) / range;
		// Map to 0.1 - 1.0 range for visibility
		return 0.1 + normalized * 0.9;
	}

	function DayCard({ index }: { index: number }) {
		const result = getDayResult(index);
		const intensity = result ? getColorIntensity(result.total) : 0;
		const bgColor = result ? `rgba(254, 173, 0, ${intensity})` : "transparent";
		const ticketMedio = result && result.qtde > 0 ? result.total / result.qtde : 0;

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
								<div className="flex items-center gap-1">
									<CirclePlus className="w-5 h-5 min-w-5 min-h-5" />
									<span className="text-xs font-medium tracking-tight">VENDAS</span>
								</div>
								<span className="text-sm font-bold">{formatDecimalPlaces(result.qtde)}</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-1">
									<BadgeDollarSign className="w-5 h-5 min-w-5 min-h-5" />
									<span className="text-xs font-medium tracking-tight">FATURAMENTO</span>
								</div>
								<span className="text-sm font-bold">{formatToMoney(result.total)}</span>
							</div>
							<div className="border-t border-primary-foreground/80 mt-1 pt-2 flex flex-col gap-1">
								<div className="flex items-center justify-between gap-4">
									<span className="text-xs font-medium tracking-tight">TICKET MÉDIO</span>
									<span className="text-sm font-bold">{formatToMoney(ticketMedio)}</span>
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
			<div className={"bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full"}>
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">POR DIA DO MÊS</h1>
					<div className="flex items-center gap-2">
						<Calendar className="w-4 h-4 min-w-4 min-h-4" />
					</div>
				</div>
				<div className="w-full flex flex-col gap-1">
					{isValidNumber(bestDayIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-green-100 text-green-600 text-xs rounded-lg font-medium">
							O melhor dia para vender foi {bestDayIndex}
						</div>
					) : null}
					{isValidNumber(worstDayIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium">
							O pior dia para vender foi {worstDayIndex}
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

function GroupedByMonth({ data }: { data: TGroupedSalesStats["porMes"] }) {
	console.log("DATA ON BY MONTH: ", data);
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

	// Calculate color intensity based on performance ranking
	const maxValue = Math.max(...data.map((item) => item.total), 0);
	const minValue = Math.min(...data.map((item) => item.total), 0);
	const range = maxValue - minValue;

	const bestMonthIndex = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).mes : null;
	const worstMonthIndex = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).mes : null;

	function getMonthResult(index: number) {
		return data.find((item) => Number(item.mes) === index + 1);
	}

	function getColorIntensity(value: number): number {
		if (range === 0) return 0.3;
		const normalized = (value - minValue) / range;
		// Map to 0.1 - 1.0 range for visibility
		return 0.1 + normalized * 0.9;
	}

	function MonthCard({ index }: { index: number }) {
		const result = getMonthResult(index);
		console.log("RESULT ON MONTH CARD: ", {
			result,
			index,
			MONTH_MAP: MONTH_MAP[(index + 1) as keyof typeof MONTH_MAP],
		});
		const intensity = result ? getColorIntensity(result.total) : 0;
		const bgColor = result ? `rgba(254, 173, 0, ${intensity})` : "transparent";
		const ticketMedio = result && result.qtde > 0 ? result.total / result.qtde : 0;

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
								<div className="flex items-center gap-1">
									<CirclePlus className="w-5 h-5 min-w-5 min-h-5" />
									<span className="text-xs font-medium tracking-tight">VENDAS</span>
								</div>
								<span className="text-sm font-bold">{formatDecimalPlaces(result.qtde)}</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-1">
									<BadgeDollarSign className="w-5 h-5 min-w-5 min-h-5" />
									<span className="text-xs font-medium tracking-tight">FATURAMENTO</span>
								</div>
								<span className="text-sm font-bold">{formatToMoney(result.total)}</span>
							</div>
							<div className="border-t border-primary-foreground/80 mt-1 pt-2 flex flex-col gap-1">
								<div className="flex items-center justify-between gap-4">
									<span className="text-xs font-medium tracking-tight">TICKET MÉDIO</span>
									<span className="text-sm font-bold">{formatToMoney(ticketMedio)}</span>
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
			<div className={"bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full"}>
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">POR MÊS</h1>
					<div className="flex items-center gap-2">
						<Calendar className="w-4 h-4 min-w-4 min-h-4" />
					</div>
				</div>
				<div className="w-full flex flex-col gap-1">
					{isValidNumber(bestMonthIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-green-100 text-green-600 text-xs rounded-lg font-medium">
							O melhor mês para vender foi {MONTH_MAP[bestMonthIndex as keyof typeof MONTH_MAP]}
						</div>
					) : null}

					{isValidNumber(worstMonthIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium">
							O pior mês para vender foi {MONTH_MAP[worstMonthIndex as keyof typeof MONTH_MAP]}
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

function GroupedByWeekDay({ data }: { data: TGroupedSalesStats["porDiaDaSemana"] }) {
	const WEEKDAY_MAP = {
		0: "Domingo",
		1: "Segunda",
		2: "Terça",
		3: "Quarta",
		4: "Quinta",
		5: "Sexta",
		6: "Sábado",
	};

	// Calculate color intensity based on performance ranking
	const maxValue = Math.max(...data.map((item) => item.total), 0);
	const minValue = Math.min(...data.map((item) => item.total), 0);
	const range = maxValue - minValue;

	const bestDayIndex = data.length > 0 ? data.reduce((max, item) => (item.total > max.total ? item : max), data[0]).diaSemana : null;
	const worstDayIndex = data.length > 0 ? data.reduce((min, item) => (item.total < min.total ? item : min), data[0]).diaSemana : null;

	function getWeekDayResult(index: number) {
		return data.find((item) => Number(item.diaSemana) === index);
	}

	function getColorIntensity(value: number): number {
		if (range === 0) return 0.3;
		const normalized = (value - minValue) / range;
		// Map to 0.1 - 1.0 range for visibility
		return 0.1 + normalized * 0.9;
	}

	function WeekDayCard({ index }: { index: number }) {
		const result = getWeekDayResult(index);
		const intensity = result ? getColorIntensity(result.total) : 0;
		const bgColor = result ? `rgba(254, 173, 0, ${intensity})` : "transparent";
		const ticketMedio = result && result.qtde > 0 ? result.total / result.qtde : 0;

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
								<div className="flex items-center gap-1">
									<CirclePlus className="w-5 h-5 min-w-5 min-h-5" />
									<span className="text-xs font-medium tracking-tight">VENDAS</span>
								</div>
								<span className="text-sm font-bold">{formatDecimalPlaces(result.qtde)}</span>
							</div>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-1">
									<BadgeDollarSign className="w-5 h-5 min-w-5 min-h-5" />
									<span className="text-xs font-medium tracking-tight">FATURAMENTO</span>
								</div>
								<span className="text-sm font-bold">{formatToMoney(result.total)}</span>
							</div>
							<div className="border-t border-primary-foreground/80 mt-1 pt-2 flex flex-col gap-1">
								<div className="flex items-center justify-between gap-4">
									<span className="text-xs font-medium tracking-tight">TICKET MÉDIO</span>
									<span className="text-sm font-bold">{formatToMoney(ticketMedio)}</span>
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
			<div className={"bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full"}>
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">POR DIA DA SEMANA</h1>
					<div className="flex items-center gap-2">
						<Calendar className="w-4 h-4 min-w-4 min-h-4" />
					</div>
				</div>
				<div className="w-full flex flex-col gap-1">
					{isValidNumber(bestDayIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-green-100 text-green-600 text-xs rounded-lg font-medium">
							O melhor dia da semana para vender foi {WEEKDAY_MAP[bestDayIndex as keyof typeof WEEKDAY_MAP]}
						</div>
					) : null}
					{isValidNumber(worstDayIndex) ? (
						<div className="w-fit text-center self-center px-4 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium">
							O pior dia da semana para vender foi {WEEKDAY_MAP[worstDayIndex as keyof typeof WEEKDAY_MAP]}
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
