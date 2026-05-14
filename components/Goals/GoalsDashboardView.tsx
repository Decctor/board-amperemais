"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatDecimalPlaces, formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { useGoalsStats } from "@/lib/queries/goals";
import type { TGetGoalsStatsHistoricoItem } from "@/app/api/goals/stats/route";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeDollarSign, CheckCircle2, ShoppingCart, Target, UserPlus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

type ActiveGoalBarProps = {
	label: string;
	icon: React.ReactNode;
	valueHit: number;
	valueGoal: number;
	formattedHit: string;
	formattedGoal: string;
	color: string;
};
function ActiveGoalBar({ label, icon, valueHit, valueGoal, formattedHit, formattedGoal, color }: ActiveGoalBarProps) {
	const percentage = valueGoal > 0 ? Math.min((valueHit / valueGoal) * 100, 100) : 0;
	const displayPercent = valueGoal > 0 ? (valueHit / valueGoal) * 100 : 0;
	const isOver = displayPercent > 100;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					{icon}
					<span className="uppercase tracking-tight font-medium text-xs">{label}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className={`text-sm font-bold ${isOver ? "text-green-600" : "text-foreground"}`}>{formatDecimalPlaces(displayPercent)}%</span>
					<span className="text-xs text-muted-foreground">
						{formattedHit} / {formattedGoal}
					</span>
				</div>
			</div>
			<div className="w-full h-3 bg-muted rounded-full overflow-hidden">
				<motion.div
					className="h-full rounded-full"
					style={{ backgroundColor: isOver ? "#16a34a" : color }}
					initial={{ width: 0 }}
					animate={{ width: `${percentage}%` }}
					transition={{ duration: 1, ease: "easeOut" }}
				/>
			</div>
		</div>
	);
}

function CustomHistoricoTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-background border border-border rounded-lg p-3 shadow-lg text-xs">
			<p className="font-semibold mb-2">{label}</p>
			{payload.map((p, i) => (
				<div key={i.toString()} className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
					<span className="text-muted-foreground">{p.name}:</span>
					<span className="font-semibold">{formatToMoney(p.value)}</span>
				</div>
			))}
		</div>
	);
}

type SellerProgressRowProps = {
	vendedor: {
		id: string;
		vendedorId: string;
		objetivoValor: number;
		realizadoValor: number;
		vendedor: { nome: string; avatarUrl: string | null };
	};
};
function SellerProgressRow({ vendedor }: SellerProgressRowProps) {
	const percentage = vendedor.objetivoValor > 0 ? Math.min((vendedor.realizadoValor / vendedor.objetivoValor) * 100, 100) : 0;
	const displayPercent = vendedor.objetivoValor > 0 ? (vendedor.realizadoValor / vendedor.objetivoValor) * 100 : 0;
	return (
		<div className="flex items-center gap-3">
			<Avatar className="w-6 h-6 min-w-6 min-h-6 shrink-0">
				<AvatarFallback className="text-[0.5rem]">{formatNameAsInitials(vendedor.vendedor.nome)}</AvatarFallback>
			</Avatar>
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between mb-0.5">
					<span className="text-xs font-medium truncate">{vendedor.vendedor.nome}</span>
					<span className={`text-xs font-bold shrink-0 ml-2 ${displayPercent >= 100 ? "text-green-600" : "text-foreground"}`}>
						{formatDecimalPlaces(displayPercent)}%
					</span>
				</div>
				<div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
					<motion.div
						className="h-full rounded-full bg-primary"
						initial={{ width: 0 }}
						animate={{ width: `${percentage}%` }}
						transition={{ duration: 0.8, ease: "easeOut" }}
					/>
				</div>
			</div>
		</div>
	);
}

export default function GoalsDashboardView() {
	const { colors } = useOrgColors();
	const { data, isLoading } = useGoalsStats();

	if (isLoading) {
		return (
			<div className="w-full flex flex-col gap-3 animate-pulse">
				<div className="w-full h-48 rounded-xl bg-muted" />
				<div className="w-full grid grid-cols-3 gap-3">
					<div className="h-24 rounded-xl bg-muted" />
					<div className="h-24 rounded-xl bg-muted" />
					<div className="h-24 rounded-xl bg-muted" />
				</div>
				<div className="w-full h-64 rounded-xl bg-muted" />
			</div>
		);
	}

	const activeGoal = data?.activeGoal ?? null;
	const historico = data?.historico ?? [];
	const totalMetas = data?.totalMetas ?? 0;
	const metasConcluidas = data?.metasConcluidas ?? 0;
	const mediaPercentual = data?.mediaPercentualConclusiaoValor ?? 0;

	const chartData = historico.map((item: TGetGoalsStatsHistoricoItem) => ({
		label: item.label,
		Realizado: item.realizadoValor,
		Objetivo: item.objetivoValor,
	}));

	const chartConfig = {
		Realizado: { label: "Realizado", color: colors.primary },
		Objetivo: { label: "Objetivo", color: "hsl(var(--muted-foreground))" },
	} satisfies ChartConfig;

	return (
		<div className="w-full flex flex-col gap-4 py-2">
			{/* Active goal card */}
			<AnimatePresence mode="wait">
				{activeGoal ? (
					<motion.div
						key="active-goal"
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.3 }}
						className="bg-card border border-primary/20 rounded-xl px-5 py-5 shadow-2xs flex flex-col gap-4"
					>
						<div className="flex items-center gap-2">
							<span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold tracking-wide bg-blue-100 text-blue-700 border border-blue-200">
								META ATIVA
							</span>
							<p className="text-xs text-muted-foreground">
								{new Date(activeGoal.dataInicio).toLocaleDateString("pt-BR")} → {new Date(activeGoal.dataFim).toLocaleDateString("pt-BR")}
							</p>
						</div>
						<div className="flex flex-col gap-3">
							<ActiveGoalBar
								label="Valor vendido"
								icon={<BadgeDollarSign className="w-4 h-4" />}
								valueHit={activeGoal.realizadoValor}
								valueGoal={activeGoal.objetivoValor}
								formattedHit={formatToMoney(activeGoal.realizadoValor)}
								formattedGoal={formatToMoney(activeGoal.objetivoValor)}
								color={colors.primary}
							/>
							{activeGoal.objetivoQtdeVendas ? (
								<ActiveGoalBar
									label="Qtde de vendas"
									icon={<ShoppingCart className="w-4 h-4" />}
									valueHit={activeGoal.realizadoQtdeVendas}
									valueGoal={activeGoal.objetivoQtdeVendas}
									formattedHit={formatDecimalPlaces(activeGoal.realizadoQtdeVendas)}
									formattedGoal={formatDecimalPlaces(activeGoal.objetivoQtdeVendas)}
									color="#f59e0b"
								/>
							) : null}
							{activeGoal.objetivoNovosClientes ? (
								<ActiveGoalBar
									label="Novos clientes"
									icon={<UserPlus className="w-4 h-4" />}
									valueHit={activeGoal.realizadoNovosClientes}
									valueGoal={activeGoal.objetivoNovosClientes}
									formattedHit={formatDecimalPlaces(activeGoal.realizadoNovosClientes)}
									formattedGoal={formatDecimalPlaces(activeGoal.objetivoNovosClientes)}
									color="#8b5cf6"
								/>
							) : null}
						</div>
						{activeGoal.vendedores.length > 0 ? (
							<div className="border-t border-border/60 pt-3 flex flex-col gap-2">
								<p className="text-[0.65rem] text-muted-foreground uppercase font-semibold tracking-wider">Por vendedor</p>
								{activeGoal.vendedores.map((v) => (
									<SellerProgressRow key={v.id} vendedor={v} />
								))}
							</div>
						) : null}
					</motion.div>
				) : (
					<motion.div
						key="no-active"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="bg-muted/30 border border-dashed border-border rounded-xl px-5 py-8 flex flex-col items-center gap-2 text-center"
					>
						<Target className="w-8 h-8 text-muted-foreground" />
						<p className="text-sm font-medium text-muted-foreground">Nenhuma meta ativa no momento</p>
						<p className="text-xs text-muted-foreground/70">Crie uma meta com a data de início e fim cobrindo o período atual.</p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* KPI cards */}
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="TOTAL DE METAS"
					icon={<Target className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: totalMetas, format: (n) => formatDecimalPlaces(n) }}
					className="w-full lg:w-1/3"
				/>
				<StatUnitCard
					title="METAS CONCLUÍDAS"
					icon={<CheckCircle2 className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: metasConcluidas, format: (n) => formatDecimalPlaces(n) }}
					className="w-full lg:w-1/3"
				/>
				<StatUnitCard
					title="MÉDIA DE CONCLUSÃO"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: mediaPercentual, format: (n) => `${formatDecimalPlaces(n)}%` }}
					className="w-full lg:w-1/3"
				/>
			</div>

			{/* Historical chart */}
			{historico.length > 0 ? (
				<div className="bg-card border border-primary/20 rounded-xl px-4 py-4 shadow-2xs flex flex-col gap-3">
					<h2 className="text-xs font-medium tracking-tight uppercase">HISTÓRICO DE METAS — VALOR</h2>
					<ChartContainer config={chartConfig} className="h-56 w-full">
						<BarChart data={chartData} barCategoryGap="30%" barGap={4}>
							<CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
							<XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
							<YAxis tickFormatter={(v) => formatToMoney(v)} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={72} />
							<ChartTooltip content={<CustomHistoricoTooltip />} />
							<Bar dataKey="Objetivo" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
							<Bar dataKey="Realizado" radius={[4, 4, 0, 0]}>
								{chartData.map((entry, index) => (
									<Cell
										key={`cell-${index}`}
										fill={entry.Realizado >= entry.Objetivo ? "#16a34a" : colors.primary}
									/>
								))}
							</Bar>
						</BarChart>
					</ChartContainer>
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<div className="flex items-center gap-1.5">
							<div className="w-3 h-3 rounded-sm bg-muted" />
							<span>Objetivo</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.primary }} />
							<span>Realizado</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div className="w-3 h-3 rounded-sm bg-green-600" />
							<span>Meta batida</span>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
