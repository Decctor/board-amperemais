import { formatDateAsLocale, formatDecimalPlaces, formatLongString } from "@/lib/formatting";
import { formatToMoney } from "@/lib/formatting";
import { useGroupedSalesStats } from "@/lib/queries/stats/grouped";
import { cn } from "@/lib/utils";
import type { TGroupedSalesStats } from "@/pages/api/stats/sales-grouped";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import type { TUserSession } from "@/schemas/users";
import React, { useEffect, useState } from "react";
import { BsCart } from "react-icons/bs";
import { FaDownload, FaLayerGroup } from "react-icons/fa";
import { useDebounce } from "use-debounce";

import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, LabelList, Pie, PieChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { FaRankingStar } from "react-icons/fa6";
import { VariableSizeList as List, VariableSizeList } from "react-window";
import { getExcelFromJSON } from "@/lib/excel-utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

type GroupedStatsBlockProps = {
	generalQueryParams: TSaleStatsGeneralQueryParams;
	user: TUserSession;
};
function GroupedStatsBlock({ generalQueryParams, user }: GroupedStatsBlockProps) {
	const userViewPermission = user.visualizacao;
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
			className="overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300"
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
		<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
			<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">PARTICIPAÇÃO POR ITEM</h1>
				<div className="flex items-center gap-1">
					<button type="button" className="text-white hover:text-cyan-500 p-1 rounded-full" onClick={() => handleExportData(data)}>
						<FaDownload size={10} />
					</button>
					<button
						type="button"
						onClick={() => setType("total")}
						className={cn(
							"px-2 py-0.5 text-[0.6rem] font-medium border border-white rounded",
							type === "total" ? "bg-white text-black" : "bg-transparent text-white",
						)}
					>
						VALOR
					</button>
					<button
						type="button"
						onClick={() => setType("qtde")}
						className={cn(
							"px-2 py-0.5 text-[0.6rem] font-medium border border-white rounded",
							type === "qtde" ? "bg-white text-black" : "bg-transparent text-white",
						)}
					>
						QUANTIDADE
					</button>
					<BsCart size={12} />
				</div>
			</div>
			<div className="px-6 py-2 flex w-full flex-col gap-2 h-[300px] lg:h-[350px] max-h-[300px] lg:max-h-[350px]">
				<ProductsList height={330} width={"100%"} list={dataSorted} />
			</div>
			{/* {dataSorted.map((d, index) => (
          <ProductRow key={`${type}-${index}`} index={index} />
        ))} */}
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
	const total = data.reduce((acc, current) => (type === "total" ? acc + current.total : acc + current.qtde), 0);
	const graphData = data
		.filter((d) => d.qtde > 100)
		.sort((a, b) => b.qtde - a.qtde)
		.map((p, index) => ({ ...p, fill: Collors[index] || "#000" }));
	const projectTypesChartConfig = { titulo: { label: "GRUPO" } };
	return (
		<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
			<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">PARTICIPAÇÃO POR GRUPO</h1>
				<div className="flex items-center gap-1">
					<button type="button" className="text-white hover:text-cyan-500 p-1 rounded-full" onClick={() => handleExportData(data)}>
						<FaDownload size={10} />
					</button>
					<button
						type="button"
						onClick={() => setType("total")}
						className={cn(
							"px-2 py-0.5 text-[0.6rem] font-medium border border-white rounded",
							type === "total" ? "bg-white text-black" : "bg-transparent text-white",
						)}
					>
						VALOR
					</button>
					<button
						type="button"
						onClick={() => setType("qtde")}
						className={cn(
							"px-2 py-0.5 text-[0.6rem] font-medium border border-white rounded",
							type === "qtde" ? "bg-white text-black" : "bg-transparent text-white",
						)}
					>
						QUANTIDADE
					</button>
					<FaLayerGroup size={12} />
				</div>
			</div>
			<div className="px-6 py-2 flex w-full flex-col gap-2 h-[300px] lg:h-[350px] max-h-[300px] lg:max-h-[350px]">
				<ChartContainer config={projectTypesChartConfig} className="h-full">
					<PieChart>
						<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={graphData}
							dataKey={type}
							nameKey="titulo"
							label={(x) => {
								console.log("PIE", x);
								return `${formatDecimalPlaces((100 * x.value) / total)}%`;
							}}
							innerRadius={60}
							strokeWidth={2}
						/>
						<ChartLegend content={<ChartLegendContent color="#000" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
					</PieChart>
				</ChartContainer>
			</div>
		</div>
	);
}

function ResultsBySellerGraph({ data }: { data: TGroupedSalesStats["porVendedor"] }) {
	const [type, setType] = useState<"qtde" | "total">("total");

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
		<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
			<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RANKING DE VENDEDORES</h1>
				<div className="flex items-center gap-1">
					<button type="button" className="text-black hover:text-cyan-500 p-1 rounded-full" onClick={() => handleExportData(data)}>
						<FaDownload size={10} />
					</button>
					<button
						type="button"
						onClick={() => setType("total")}
						className={cn(
							"px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded",
							type === "total" ? "bg-black text-white" : "bg-transparent text-black",
						)}
					>
						VALOR
					</button>
					<button
						type="button"
						onClick={() => setType("qtde")}
						className={cn(
							"px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded",
							type === "qtde" ? "bg-black text-white" : "bg-transparent text-black",
						)}
					>
						QUANTIDADE
					</button>
					<FaRankingStar size={12} />
				</div>
			</div>

			<div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] :max-h-[450px]">
				<ResponsiveContainer className={"w-full h-full"}>
					<ChartContainer config={chartConfig} className="w-full h-full">
						<BarChart
							margin={{
								left: 40,
								right: 25,
							}}
							accessibilityLayer
							data={data.sort((a, b) => (type === "total" ? b.total - a.total : b.qtde - a.qtde))}
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
				</ResponsiveContainer>
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
		<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
			<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RANKING DE PARCEIROS</h1>
				<div className="flex items-center gap-1">
					<button type="button" className="text-black hover:text-cyan-500 p-1 rounded-full" onClick={() => handleExportData(data)}>
						<FaDownload size={10} />
					</button>
					<button
						type="button"
						onClick={() => setType("total")}
						className={cn(
							"px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded",
							type === "total" ? "bg-black text-white" : "bg-transparent text-black",
						)}
					>
						VALOR
					</button>
					<button
						type="button"
						onClick={() => setType("qtde")}
						className={cn(
							"px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded",
							type === "qtde" ? "bg-black text-white" : "bg-transparent text-black",
						)}
					>
						QUANTIDADE
					</button>
					<FaRankingStar size={12} />
				</div>
			</div>

			<div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] :max-h-[450px]">
				<ResponsiveContainer className={"w-full h-full"}>
					<ChartContainer config={chartConfig} className="w-full h-full">
						<BarChart
							margin={{
								left: 40,
								right: 25,
							}}
							accessibilityLayer
							data={data.sort((a, b) => (type === "total" ? b.total - a.total : b.qtde - a.qtde))}
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
				</ResponsiveContainer>
			</div>
		</div>
	);
}
