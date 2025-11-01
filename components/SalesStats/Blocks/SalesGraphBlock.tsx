"use client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/errors";
import { getExcelFromJSON } from "@/lib/excel-utils";
import { formatToMoney } from "@/lib/formatting";
import { useSalesGraph } from "@/lib/queries/stats/sales-graph";
import { cn } from "@/lib/utils";
import type { TSalesGraphOutput } from "@/pages/api/stats/sales-graph";
import type { TSaleStatsGeneralQueryParams, TSalesGraphFilters } from "@/schemas/query-params-utils";
import type { TUserSession } from "@/schemas/users";
import { BadgeDollarSign, CirclePlus, Download } from "lucide-react";
import React, { useEffect, useState } from "react";
import { BsFillFileBarGraphFill } from "react-icons/bs";
import { FaDownload } from "react-icons/fa";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "../../ui/chart";

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
			<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-xs">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">GRÁFICO DE VENDAS</h1>
					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant={"ghost"} size="fit" className="rounded-lg p-2" onClick={() => handleExportData(salesGraph)}>
										<Download className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Baixar</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={graphMetric === "total" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setGraphMetric("total")}
									>
										<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Valor Vendido</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant={graphMetric === "qtde" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setGraphMetric("qtde")}>
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
				<div className="flex w-full items-center gap-4">
					<div className="flex max-h-[400px] min-h-[400px] w-full items-center justify-center lg:max-h-[350px] lg:min-h-[350px]">
						<ChartContainer className="aspect-auto h-[350px] w-full lg:h-[250px]" config={chartConfig}>
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
		</div>
	);
}

export default SalesGraphBlock;
