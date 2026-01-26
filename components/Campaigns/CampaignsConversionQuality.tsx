"use client";
import type { TGetConversionQualityInput } from "@/app/api/campaigns/stats/conversion-quality/route";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useConversionQuality } from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Clock, DollarSign, RefreshCw, Rocket, TrendingDown, TrendingUp, UserPlus, Users, Zap } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type CampaignsConversionQualityProps = {
	startDate: Date | null;
	endDate: Date | null;
	campanhaId?: string | null;
};

const CONVERSION_TYPE_CONFIG: Record<
	string,
	{
		label: string;
		color: string;
		bgColor: string;
		icon: React.ReactNode;
		description: string;
	}
> = {
	AQUISICAO: {
		label: "Aquisição",
		color: "#22c55e",
		bgColor: "bg-green-500/10",
		icon: <UserPlus className="w-4 h-4" />,
		description: "Novos clientes",
	},
	REATIVACAO: {
		label: "Reativação",
		color: "#f59e0b",
		bgColor: "bg-amber-500/10",
		icon: <RefreshCw className="w-4 h-4" />,
		description: "Clientes reativados",
	},
	ACELERACAO: {
		label: "Aceleração",
		color: "#3b82f6",
		bgColor: "bg-blue-500/10",
		icon: <Zap className="w-4 h-4" />,
		description: "Voltaram mais rápido",
	},
	REGULAR: {
		label: "Regular",
		color: "#8b5cf6",
		bgColor: "bg-violet-500/10",
		icon: <Users className="w-4 h-4" />,
		description: "Ciclo normal",
	},
	ATRASADA: {
		label: "Atrasada",
		color: "#ef4444",
		bgColor: "bg-red-500/10",
		icon: <Clock className="w-4 h-4" />,
		description: "Voltaram mais tarde",
	},
};

export default function CampaignsConversionQuality({ startDate, endDate, campanhaId }: CampaignsConversionQualityProps) {
	const { data, isLoading } = useConversionQuality({
		startDate: startDate ?? undefined,
		endDate: endDate ?? undefined,
		campanhaId: campanhaId ?? undefined,
	});

	const chartData =
		data?.distribuicaoTipos.map((item) => ({
			name: CONVERSION_TYPE_CONFIG[item.tipo ?? ""]?.label ?? item.tipo,
			value: item.quantidade,
			percentual: item.percentual,
			receita: item.receita,
			color: CONVERSION_TYPE_CONFIG[item.tipo ?? ""]?.color ?? "#94a3b8",
		})) ?? [];

	const impactMetrics = data
		? [
				{
					label: "Impacto na Frequência",
					sublabel: "dias antecipados em média",
					value: data.impactoFrequencia.mediasDiasAntecipados,
					icon: <Rocket className="w-4 h-4" />,
					positive: data.impactoFrequencia.deltaFrequenciaMedio > 0,
					secondary: `${data.impactoFrequencia.totalAceleradas} aceleradas | ${data.impactoFrequencia.totalAtrasadas} atrasadas`,
				},
				{
					label: "Impacto no Ticket",
					sublabel: "variação média no valor",
					value: data.impactoMonetario.deltaMonetarioPercentualMedio,
					suffix: "%",
					icon: <DollarSign className="w-4 h-4" />,
					positive: data.impactoMonetario.deltaMonetarioPercentualMedio > 0,
					secondary: `${data.impactoMonetario.totalAcimaTicket} acima | ${data.impactoMonetario.totalAbaixoTicket} abaixo`,
				},
			]
		: [];

	return (
		<div className="w-full flex flex-col gap-2 py-2 h-full">
			<div className="bg-card border-primary/20 flex w-full h-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
					<h1 className="text-xs font-medium tracking-tight uppercase">QUALIDADE DAS CONVERSÕES</h1>
					{data && (
						<div className="flex items-center gap-1.5 rounded-md px-2 py-1 bg-primary/10">
							<span className="text-xs font-bold text-primary">
								{formatDecimalPlaces(data.resumo.totalConversoes)} conversões | {formatToMoney(data.resumo.totalReceita)}
							</span>
						</div>
					)}
				</div>

				<div className="flex w-full flex-1 flex-col lg:flex-row gap-4 overflow-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 min-h-0">
					{isLoading ? (
						<div className="flex w-full h-full items-center justify-center">
							<p className="text-sm text-muted-foreground">Carregando análise...</p>
						</div>
					) : data && data.resumo.totalConversoes > 0 ? (
						<>
							{/* Pie Chart */}
							<div className="w-full lg:w-1/2 flex flex-col gap-2">
								<h2 className="text-xs font-semibold text-muted-foreground">DISTRIBUIÇÃO POR TIPO</h2>
								<div className="flex-1 min-h-[200px] flex items-center">
									<ResponsiveContainer width="100%" height={200}>
										<PieChart>
											<Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
												{chartData.map((entry, index) => (
													<Cell key={`cell-${index.toString()}`} fill={entry.color} />
												))}
											</Pie>
											<Tooltip
												content={({ active, payload }) => {
													if (active && payload && payload.length) {
														const data = payload[0]?.payload;
														return (
															<div className="bg-popover border rounded-lg p-2 shadow-lg">
																<p className="text-xs font-bold">{data.name}</p>
																<p className="text-xs text-muted-foreground">
																	{formatDecimalPlaces(data.value)} ({formatDecimalPlaces(data.percentual)}%)
																</p>
																<p className="text-xs text-muted-foreground">{formatToMoney(data.receita)}</p>
															</div>
														);
													}
													return null;
												}}
											/>
										</PieChart>
									</ResponsiveContainer>
								</div>
								{/* Legend */}
								<div className="flex flex-wrap gap-2 justify-center">
									{chartData.map((item) => (
										<div key={item.name} className="flex items-center gap-1.5">
											<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
											<span className="text-xs text-muted-foreground">
												{item.name} ({formatDecimalPlaces(item.percentual)}%)
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Type Breakdown & Impact Metrics */}
							<div className="w-full lg:w-1/2 flex flex-col gap-4">
								{/* Type Breakdown */}
								<div className="flex flex-col gap-2">
									<h2 className="text-xs font-semibold text-muted-foreground">DETALHAMENTO</h2>
									<div className="flex flex-col gap-1.5">
										{data.distribuicaoTipos.map((item) => {
											const config = CONVERSION_TYPE_CONFIG[item.tipo ?? ""];
											return (
												<div key={item.tipo} className={cn("flex items-center justify-between gap-2 rounded-lg px-2 py-1.5", config?.bgColor ?? "bg-muted")}>
													<div className="flex items-center gap-2">
														<span className="text-primary">{config?.icon}</span>
														<div className="flex flex-col">
															<span className="text-xs font-semibold">{config?.label ?? item.tipo}</span>
															<span className="text-[0.65rem] text-muted-foreground">{config?.description}</span>
														</div>
													</div>
													<div className="flex flex-col items-end">
														<span className="text-xs font-bold">{formatDecimalPlaces(item.quantidade)}</span>
														<span className="text-[0.65rem] text-muted-foreground">{formatToMoney(item.receita)}</span>
													</div>
												</div>
											);
										})}
									</div>
								</div>

								{/* Impact Metrics */}
								<div className="flex flex-col gap-2">
									<h2 className="text-xs font-semibold text-muted-foreground">IMPACTO DAS CAMPANHAS</h2>
									<div className="flex flex-col gap-1.5">
										{impactMetrics.map((metric) => (
											<div key={metric.label} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-2">
												<div className="flex items-center gap-2">
													<div className={cn("p-1.5 rounded-lg", metric.positive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600")}>
														{metric.icon}
													</div>
													<div className="flex flex-col">
														<span className="text-xs font-semibold">{metric.label}</span>
														<span className="text-[0.65rem] text-muted-foreground">{metric.secondary}</span>
													</div>
												</div>
												<div className="flex items-center gap-1">
													{metric.positive ? <TrendingUp className="w-3.5 h-3.5 text-green-600" /> : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
													<span className={cn("text-sm font-bold", metric.positive ? "text-green-600" : "text-red-600")}>
														{metric.positive ? "+" : ""}
														{formatDecimalPlaces(metric.value)}
														{metric.suffix ?? ""}
													</span>
												</div>
											</div>
										))}
									</div>
								</div>

								{/* Data Quality Indicator */}
								{data.resumo.conversoesComCicloConfiavel > 0 && (
									<div className="flex items-center gap-2 text-muted-foreground">
										<span className="text-[0.65rem]">
											{formatDecimalPlaces(data.resumo.conversoesComCicloConfiavel)} conversões com dados de ciclo confiáveis (3+ compras anteriores)
										</span>
									</div>
								)}
							</div>
						</>
					) : (
						<div className="flex w-full h-full items-center justify-center">
							<p className="text-sm text-muted-foreground">Nenhum dado de qualidade disponível para o período selecionado.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
