import { useSalesGraph } from "@/lib/queries/stats/sales-graph";
import { cn } from "@/lib/utils";
import type { TSalesGraphFilters, TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import type { TUserSession } from "@/schemas/users";
import React, { useEffect, useState } from "react";
import { BsFillFileBarGraphFill } from "react-icons/bs";
import { useDebounce } from "use-debounce";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "../../ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, XAxis, YAxis } from "recharts";
import { getExcelFromJSON } from "@/lib/excel-utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { FaDownload } from "react-icons/fa";
import type { TSalesGraphOutput } from "@/pages/api/stats/sales-graph";
import { formatToMoney } from "@/lib/formatting";

type SalesGraphBlockProps = {
	user: TUserSession;
	generalQueryParams: TSaleStatsGeneralQueryParams;
};
function SalesGraphBlock({ user, generalQueryParams }: SalesGraphBlockProps) {
	const userViewPermission = user.visualizacao;
	const [graphMetric, setGraphMetric] = useState<"total" | "qtde">("total");
	const [queryParams, setQueryParams] = useState<TSalesGraphFilters>({
		...generalQueryParams,
		group: "DIA",
	});

	const [debouncedQueryParams] = useDebounce(queryParams, 1000);

	const { data: salesGraph, isLoading: salesGraphLoading } = useSalesGraph(debouncedQueryParams);

	async function handleExportData(data: TSalesGraphOutput | undefined) {
		try {
			if (!data) throw new Error("Não há dados para exportar");
			const exportationJSON = data.map((item) => ({
				PERÍODO: item.titulo,
				"PERÍODO ATUAL - META": item.meta,
				"PERÍODO ATUAL - VALOR VENDIDO": item.ATUAL.total,
				"PERÍODO ATUAL - Nº DE VENDAS": item.ATUAL.qtde,
				"PERÍODO ANTERIOR - VALOR VENDIDO": item.ANTERIOR.total,
				"PERÍODO ANTERIOR - Nº DE VENDAS": item.ANTERIOR.qtde,
			}));
			getExcelFromJSON(exportationJSON, "VENDAS_POR_PERÍODO.xlsx");
			return toast.success("Dados exportados com sucesso");
		} catch (error) {
			const msg = getErrorMessage(error);
			return toast.error(msg);
		}
	}
	const chartConfig = {
		titulo: {
			label: "DATA",
		},
		"ATUAL.total": {
			label: "Período Atual - Valor Vendido",
			color: "#fead41",
		},
		"ATUAL.qtde": {
			label: "Período Atual - Qtde de Vendas",
			color: "#fead41",
		},
		"ANTERIOR.total": {
			label: "Período Anterior - Valor Vendido",
			color: "#15599a",
		},
		"ANTERIOR.qtde": {
			label: "Período Anterior - Qtde de Vendas",
			color: "#15599a",
		},
		meta: {
			label: "Meta",
			color: "#000000",
		},
	} satisfies ChartConfig;
	useEffect(() => {
		setQueryParams((prev) => ({ ...prev, ...generalQueryParams }));
	}, [generalQueryParams]);
	return (
		<div className="w-full flex flex-col gap-2 py-2">
			<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
				<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
					<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">GRÁFICO DE VENDAS</h1>
					<div className="flex items-center gap-1">
						<button type="button" className="text-black hover:text-cyan-500 p-1 rounded-full" onClick={() => handleExportData(salesGraph)}>
							<FaDownload size={10} />
						</button>
						<button
							type="button"
							onClick={() => setGraphMetric("total")}
							className={cn(
								"px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded",
								graphMetric === "total" ? "bg-black text-white" : "bg-transparent text-black",
							)}
						>
							VALOR
						</button>
						<button
							type="button"
							onClick={() => setGraphMetric("qtde")}
							className={cn(
								"px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded",
								graphMetric === "qtde" ? "bg-black text-white" : "bg-transparent text-black",
							)}
						>
							QUANTIDADE
						</button>
						<BsFillFileBarGraphFill size={12} />
					</div>
				</div>
				<div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] max-h-[450px]">
					<ChartContainer className="w-full h-full" config={chartConfig}>
						<ComposedChart
							accessibilityLayer
							data={salesGraph || []}
							margin={{
								top: 15,
								right: 15,
								left: 15,
								bottom: 15,
							}}
						>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="titulo" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 12)} />

							<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />

							<defs>
								<linearGradient id="fillCurrentTotalSold" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={chartConfig["ATUAL.total"].color} stopOpacity={0.8} />
									<stop offset="95%" stopColor={chartConfig["ATUAL.total"].color} stopOpacity={0.1} />
								</linearGradient>
								<linearGradient id="fillPreviousTotalSold" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={chartConfig["ANTERIOR.total"].color} stopOpacity={0.8} />
									<stop offset="95%" stopColor={chartConfig["ANTERIOR.total"].color} stopOpacity={0.1} />
								</linearGradient>
							</defs>
							{graphMetric === "total" ? (
								<>
									{/* YAxis para valores (área) */}
									<YAxis yAxisId="left" orientation="left" tickFormatter={(value) => formatToMoney(value)} stroke={chartConfig["ATUAL.total"].color} />

									{/* Áreas para valores totais */}
									<Area
										yAxisId="left"
										dataKey="ATUAL.total"
										type="monotone"
										fill="url(#fillCurrentTotalSold)"
										fillOpacity={0.4}
										stroke={chartConfig["ATUAL.total"].color}
										stackId="area"
									/>
									<Area
										yAxisId="left"
										dataKey="ANTERIOR.total"
										type="monotone"
										fill="url(#fillPreviousTotalSold)"
										fillOpacity={0.4}
										stroke={chartConfig["ANTERIOR.total"].color}
										stackId="area"
									/>

									{/* Linha para meta */}
									<Line yAxisId="left" type="monotone" dataKey="meta" stroke={chartConfig.meta.color} strokeDasharray="5 5" dot={false} />
								</>
							) : null}

							{graphMetric === "qtde" ? (
								<>
									{/* YAxis para quantidade (barras) */}
									<YAxis yAxisId="right" orientation="right" stroke={chartConfig["ATUAL.qtde"].color} />

									{/* Barras para quantidade */}
									<Bar
										yAxisId="right"
										dataKey="ATUAL.qtde"
										fill={chartConfig["ATUAL.qtde"].color}
										name={chartConfig["ATUAL.qtde"].label}
										stackId="bar-current"
										radius={[4, 4, 0, 0]}
										barSize={20}
									/>
									<Bar
										yAxisId="right"
										dataKey="ANTERIOR.qtde"
										fill={chartConfig["ANTERIOR.qtde"].color}
										name={chartConfig["ANTERIOR.qtde"].label}
										stackId="bar-previous"
										radius={[4, 4, 0, 0]}
										barSize={20}
									/>
								</>
							) : null}
						</ComposedChart>
					</ChartContainer>
				</div>
			</div>
		</div>
	);
}

export default SalesGraphBlock;
