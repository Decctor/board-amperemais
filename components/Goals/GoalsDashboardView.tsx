"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatDecimalPlaces, formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { useGoalsStats } from "@/lib/queries/goals";
import type { TGetGoalsStatsActiveGoal, TGetGoalsStatsHistoricoItem } from "@/app/api/goals/stats/route";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BadgeDollarSign, CheckCircle2, ChevronDown, ChevronUp, Target } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import GoalPaceChip from "./GoalPaceChip";
import GoalPaceCurveChart from "./GoalPaceCurveChart";
import GoalPaceHero, { type TGoalPaceUnit } from "./GoalPaceHero";

/**
 * Dashboard de metas em três níveis de revelação.
 *
 * Nível 1 é o herói: o que hoje pede e se a meta está adiantada ou atrasada — a resposta que o
 * lojista abre o app para ter, sem um clique. Nível 2 é o controle segmentado dia/semana/mês, que
 * troca o recorte sem trocar de tela. Nível 3 fica atrás de um expandir: a curva acumulada e o
 * detalhamento por vendedor, que só interessam a quem já viu o número de cima e quer entender.
 */

function HistoricoTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-lg border border-border bg-background p-3 text-xs shadow-lg">
			<p className="mb-2 font-bold">{label}</p>
			{payload.map((item) => (
				<div key={item.name} className="flex items-center gap-2">
					<span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
					<span className="text-muted-foreground">{item.name}:</span>
					<span className="font-bold tabular-nums">{formatToMoney(item.value)}</span>
				</div>
			))}
		</div>
	);
}

type SellerPaceRowProps = {
	vendedor: TGetGoalsStatsActiveGoal["vendedores"][number];
	ritmo: TGetGoalsStatsActiveGoal["ritmo"] | null;
	unit: TGoalPaceUnit;
};

function SellerPaceRow({ vendedor, ritmo, unit }: SellerPaceRowProps) {
	const { colors } = useOrgColors();
	const sellerRitmo = ritmo?.vendedores.find((item) => item.vendedorId === vendedor.vendedorId) ?? null;

	const meta =
		unit === "DIA"
			? (sellerRitmo?.metaDia?.valor ?? null)
			: unit === "SEMANA"
				? (sellerRitmo?.metaSemana?.valor ?? null)
				: vendedor.objetivoValor;
	const realizado =
		unit === "DIA" ? (sellerRitmo?.realizadoDia.valor ?? 0) : unit === "SEMANA" ? (sellerRitmo?.realizadoSemana.valor ?? 0) : vendedor.realizadoValor;

	const hasGoal = typeof meta === "number" && meta > 0;
	const percent = hasGoal ? (realizado / meta) * 100 : 0;

	return (
		<div className="flex items-center gap-3">
			<Avatar className="h-7 w-7 min-h-7 min-w-7 shrink-0">
				<AvatarImage src={vendedor.vendedor.avatarUrl ?? undefined} />
				<AvatarFallback className="text-[0.55rem]">{formatNameAsInitials(vendedor.vendedor.nome)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-baseline justify-between gap-2">
					<span className="truncate text-xs font-bold">{vendedor.vendedor.nome}</span>
					<span className="shrink-0 text-[0.68rem] tabular-nums text-muted-foreground">
						<strong className={cn("font-bold", percent >= 100 ? "text-success" : "text-foreground")}>{formatToMoney(realizado)}</strong>
						{hasGoal ? ` de ${formatToMoney(meta)}` : null}
					</span>
				</div>
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<motion.div
						className="h-full w-full origin-left rounded-full"
						style={{ backgroundColor: percent >= 100 ? "var(--color-success)" : colors.primary }}
						initial={{ transform: "scaleX(0)" }}
						animate={{ transform: `scaleX(${Math.min(1, percent / 100)})` }}
						transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
					/>
				</div>
			</div>
			{sellerRitmo ? <GoalPaceChip situacao={sellerRitmo.situacao} diferenca={sellerRitmo.diferenca} size="sm" className="shrink-0" /> : null}
		</div>
	);
}

export default function GoalsDashboardView() {
	const { colors } = useOrgColors();
	const { data, isLoading } = useGoalsStats();
	const [unit, setUnit] = useQueryState("unidade", parseAsStringEnum<TGoalPaceUnit>(["DIA", "SEMANA", "MES"]).withDefault("DIA"));
	const [detailsAreOpen, setDetailsAreOpen] = useState(false);

	if (isLoading) {
		return (
			<div className="flex w-full animate-pulse flex-col gap-4 py-2">
				<div className="h-64 w-full rounded-2xl bg-muted" />
				<div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-3">
					<div className="h-24 rounded-2xl bg-muted" />
					<div className="h-24 rounded-2xl bg-muted" />
					<div className="h-24 rounded-2xl bg-muted" />
				</div>
				<div className="h-64 w-full rounded-2xl bg-muted" />
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
		Objetivo: { label: "Objetivo", color: "var(--color-muted-foreground)" },
	} satisfies ChartConfig;

	const hasDetails = Boolean(activeGoal?.ritmo) || (activeGoal?.vendedores.length ?? 0) > 0;

	return (
		<div className="flex w-full flex-col gap-4 py-2">
			{activeGoal ? (
				<div className="flex w-full flex-col gap-3">
					<GoalPaceHero goal={activeGoal} unit={unit} onUnitChange={setUnit} />

					{hasDetails ? (
						<>
							<button
								type="button"
								onClick={() => setDetailsAreOpen((value) => !value)}
								aria-expanded={detailsAreOpen}
								className="flex w-fit items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40"
							>
								{detailsAreOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
								{detailsAreOpen ? "Ocultar detalhamento" : "Ver curva e vendedores"}
							</button>

							{detailsAreOpen ? (
								<div className="flex w-full flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-2xs">
									{activeGoal.ritmo ? (
										<GoalPaceCurveChart curva={activeGoal.ritmo.curva} origemDistribuicao={activeGoal.ritmo.origemDistribuicao} />
									) : null}
									{activeGoal.vendedores.length > 0 ? (
										<div className="flex flex-col gap-3 border-t border-border/60 pt-4">
											<h3 className="text-xs font-extrabold uppercase tracking-[0.08em]">
												Por vendedor {unit === "DIA" ? "· hoje" : unit === "SEMANA" ? "· esta semana" : "· período"}
											</h3>
											<div className="flex flex-col gap-3">
												{activeGoal.vendedores.map((vendedor) => (
													<SellerPaceRow key={vendedor.id} vendedor={vendedor} ritmo={activeGoal.ritmo} unit={unit} />
												))}
											</div>
										</div>
									) : null}
								</div>
							) : null}
						</>
					) : null}
				</div>
			) : (
				<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
					<Target className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-bold">Nenhuma meta ativa no momento</p>
					<p className="max-w-[46ch] text-xs text-muted-foreground">
						Crie uma meta cobrindo o período atual e o painel passa a mostrar quanto hoje precisa vender para o mês fechar.
					</p>
				</div>
			)}

			<div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-3">
				<StatUnitCard title="TOTAL DE METAS" icon={<Target className="h-4 w-4 min-h-4 min-w-4" />} current={{ value: totalMetas, format: (n) => formatDecimalPlaces(n) }} />
				<StatUnitCard
					title="METAS CONCLUÍDAS"
					icon={<CheckCircle2 className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: metasConcluidas, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="MÉDIA DE CONCLUSÃO"
					icon={<BadgeDollarSign className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: mediaPercentual, format: (n) => `${formatDecimalPlaces(n)}%` }}
				/>
			</div>

			{historico.length > 0 ? (
				<div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-2xs">
					<h2 className="text-xs font-extrabold uppercase tracking-[0.08em]">Histórico de metas — valor</h2>
					<ChartContainer config={chartConfig} className="h-56 w-full">
						<BarChart data={chartData} barCategoryGap="30%" barGap={4}>
							<CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
							<XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
							<YAxis tickFormatter={(value) => formatToMoney(value)} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={78} />
							<ChartTooltip content={<HistoricoTooltip />} />
							<Bar dataKey="Objetivo" fill="var(--color-muted)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="Realizado" radius={[4, 4, 0, 0]}>
								{chartData.map((entry) => (
									<Cell key={entry.label} fill={entry.Realizado >= entry.Objetivo ? "var(--color-success)" : colors.primary} />
								))}
							</Bar>
						</BarChart>
					</ChartContainer>
					<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<span className="h-3 w-3 rounded-sm bg-muted" />
							Objetivo
						</span>
						<span className="flex items-center gap-1.5">
							<span className="h-3 w-3 rounded-sm" style={{ backgroundColor: colors.primary }} />
							Realizado
						</span>
						<span className="flex items-center gap-1.5">
							<span className="h-3 w-3 rounded-sm bg-success" />
							Meta batida
						</span>
					</div>
				</div>
			) : null}
		</div>
	);
}
