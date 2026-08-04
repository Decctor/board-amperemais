"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TGetGoalsStatsActiveGoal } from "@/app/api/goals/stats/route";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { BadgeDollarSign, CalendarDays, ShoppingCart, UserPlus } from "lucide-react";
import GoalPaceChip from "./GoalPaceChip";

/**
 * O topo do dashboard de metas: o que hoje pede, e se a meta está adiantada ou atrasada.
 *
 * A pergunta que o lojista abre o app para responder é "62% no dia 20 é bom ou ruim?". O percentual
 * do mês não responde, então o herói não é o percentual: é a **meta de hoje** com o realizado de
 * hoje, e ao lado o veredito contra o esperado até ontem.
 *
 * A unidade (dia / semana / mês) é um controle segmentado e não três telas: as três leituras são
 * recortes da mesma curva, e trocar de recorte não deveria custar navegação.
 */

/** Unidade de leitura da meta. Vai para a URL, então o valor é dado: português. */
export type TGoalPaceUnit = "DIA" | "SEMANA" | "MES";

const UNIT_TABS: { value: TGoalPaceUnit; label: string }[] = [
	{ value: "DIA", label: "Dia" },
	{ value: "SEMANA", label: "Semana" },
	{ value: "MES", label: "Mês" },
];

type GoalMetricBarProps = {
	label: string;
	icon: React.ReactNode;
	valueHit: number;
	valueGoal: number | null;
	formattedHit: string;
	formattedGoal: string;
	color: string;
	emphasis?: boolean;
};

function GoalMetricBar({ label, icon, valueHit, valueGoal, formattedHit, formattedGoal, color, emphasis = false }: GoalMetricBarProps) {
	const hasGoal = typeof valueGoal === "number" && valueGoal > 0;
	const percent = hasGoal ? (valueHit / valueGoal) * 100 : 0;
	const isOver = percent >= 100;

	return (
		<div className="flex w-full flex-col gap-1.5">
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<div className="flex items-center gap-1.5 text-muted-foreground">
					{icon}
					<span className="text-xs font-extrabold uppercase tracking-[0.08em]">{label}</span>
				</div>
				<div className="flex items-baseline gap-2 tabular-nums">
					<span className={cn("font-extrabold", emphasis ? "text-2xl" : "text-sm", isOver && "text-success")}>{formattedHit}</span>
					<span className="text-xs font-medium text-muted-foreground">de {formattedGoal}</span>
				</div>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
				{/* scaleX em vez de width: transform é composto, width dispara layout a cada frame. */}
				<motion.div
					className="h-full w-full origin-left rounded-full"
					style={{ backgroundColor: isOver ? "var(--color-success)" : color }}
					initial={{ transform: "scaleX(0)" }}
					animate={{ transform: `scaleX(${Math.min(1, hasGoal ? percent / 100 : 0)})` }}
					transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
				/>
			</div>
			{hasGoal ? <p className="text-[0.68rem] font-semibold tabular-nums text-muted-foreground">{formatDecimalPlaces(percent)}% da meta</p> : null}
		</div>
	);
}

/** Rótulo do dia da semana em que a loja não vende, para o estado de meta zero. */
const WEEKDAY_LABELS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/**
 * Data por extenso em português.
 *
 * Via `Intl` e não pelo locale do dayjs: `dayjs.locale("pt-br")` é global, e chamá-lo daqui mudaria
 * a formatação de todo outro consumidor de dayjs do mesmo bundle. Sem ele, `format("dddd")` sairia
 * em inglês no meio de uma tela em português.
 */
const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

type GoalPaceHeroProps = {
	goal: TGetGoalsStatsActiveGoal;
	unit: TGoalPaceUnit;
	onUnitChange: (unit: TGoalPaceUnit) => void;
};

export default function GoalPaceHero({ goal, unit, onUnitChange }: GoalPaceHeroProps) {
	const { colors } = useOrgColors();
	const ritmo = goal.ritmo;

	const janelaSemanaLabel = ritmo?.janelaSemana
		? `${dayjs(ritmo.janelaSemana.inicio).format("DD/MM")} – ${dayjs(ritmo.janelaSemana.fim).format("DD/MM")} · ${ritmo.janelaSemana.diasNoPeriodo} ${
				ritmo.janelaSemana.diasNoPeriodo === 1 ? "dia dentro da meta" : "dias dentro da meta"
			}`
		: null;

	const view =
		unit === "DIA"
			? {
					titulo: "Hoje",
					contexto: LONG_DATE_FORMATTER.format(new Date()),
					metas: ritmo?.metaDia ?? null,
					realizado: ritmo?.realizadoDia ?? null,
				}
			: unit === "SEMANA"
				? {
						titulo: "Esta semana",
						contexto: janelaSemanaLabel,
						metas: ritmo?.metaSemana ?? null,
						realizado: ritmo?.realizadoSemana ?? null,
					}
				: {
						titulo: "Período completo",
						contexto: `${dayjs(goal.dataInicio).format("DD/MM/YYYY")} → ${dayjs(goal.dataFim).format("DD/MM/YYYY")}`,
						metas: { valor: goal.objetivoValor, qtdeVendas: goal.objetivoQtdeVendas, novosClientes: goal.objetivoNovosClientes },
						realizado: { valor: goal.realizadoValor, qtdeVendas: goal.realizadoQtdeVendas, novosClientes: goal.realizadoNovosClientes },
					};

	// Uma loja que nunca vende neste dia da semana tem meta zero, o que é correto. Uma barra 0/0
	// marcando 0% leria como falha; o dia sem meta merece dizer o que é.
	const isDiaSemMeta = unit === "DIA" && (view.metas?.valor ?? 0) <= 0;

	return (
		<div className="flex w-full flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-2xs lg:p-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex min-w-0 flex-col gap-1.5">
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-primary">
							Meta ativa
						</span>
						{ritmo ? (
							<span className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
								<CalendarDays className="h-3.5 w-3.5" />
								Dia {ritmo.diaAtualDoPeriodo} de {ritmo.totalDias}
							</span>
						) : null}
					</div>
					<h2 className="text-2xl font-extrabold tracking-[-0.015em]">{view.titulo}</h2>
					{view.contexto ? <p className="text-sm text-muted-foreground first-letter:uppercase">{view.contexto}</p> : null}
				</div>

				<div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
					<Tabs value={unit} onValueChange={(value) => onUnitChange(value as TGoalPaceUnit)}>
						<TabsList variant="page">
							{UNIT_TABS.map((tab) => (
								<TabsTrigger key={tab.value} value={tab.value}>
									{tab.label}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
					{ritmo ? <GoalPaceChip situacao={ritmo.situacao} diferenca={ritmo.diferenca} /> : null}
				</div>
			</div>

			{isDiaSemMeta ? (
				<div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
					<p className="text-sm font-semibold">Sem meta para hoje.</p>
					<p className="text-xs text-muted-foreground">
						Seu histórico não registra vendas em {WEEKDAY_LABELS[new Date().getDay()]}, então a meta do mês foi distribuída nos outros dias.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					<GoalMetricBar
						label="Valor vendido"
						icon={<BadgeDollarSign className="h-4 w-4" />}
						valueHit={view.realizado?.valor ?? 0}
						valueGoal={view.metas?.valor ?? null}
						formattedHit={formatToMoney(view.realizado?.valor ?? 0)}
						formattedGoal={formatToMoney(view.metas?.valor ?? 0)}
						color={colors.primary}
						emphasis
					/>
					{view.metas?.qtdeVendas ? (
						<GoalMetricBar
							label="Qtde de vendas"
							icon={<ShoppingCart className="h-4 w-4" />}
							valueHit={view.realizado?.qtdeVendas ?? 0}
							valueGoal={view.metas.qtdeVendas}
							formattedHit={formatDecimalPlaces(view.realizado?.qtdeVendas ?? 0, 0, 0)}
							formattedGoal={formatDecimalPlaces(view.metas.qtdeVendas, 0, 1)}
							color="var(--color-brand-secondary)"
						/>
					) : null}
					{view.metas?.novosClientes ? (
						<GoalMetricBar
							label="Novos clientes"
							icon={<UserPlus className="h-4 w-4" />}
							valueHit={view.realizado?.novosClientes ?? 0}
							valueGoal={view.metas.novosClientes}
							formattedHit={formatDecimalPlaces(view.realizado?.novosClientes ?? 0, 0, 0)}
							formattedGoal={formatDecimalPlaces(view.metas.novosClientes, 0, 1)}
							color="var(--color-brand)"
						/>
					) : null}
				</div>
			)}

			{ritmo && unit !== "MES" ? (
				<div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
					<span className="tabular-nums">
						Esperado até ontem: <strong className="font-bold text-foreground">{formatToMoney(ritmo.esperadoAcumulado.valor)}</strong>
					</span>
					<span className="tabular-nums">
						Realizado: <strong className="font-bold text-foreground">{formatToMoney(ritmo.realizadoAcumulado.valor)}</strong>
					</span>
					{ritmo.ritmoNecessarioDiario !== null ? (
						<span className="tabular-nums">
							Ritmo necessário: <strong className="font-bold text-foreground">{formatToMoney(ritmo.ritmoNecessarioDiario)}</strong>/dia nos{" "}
							{ritmo.diasRestantes} dias restantes
						</span>
					) : null}
				</div>
			) : null}
		</div>
	);
}
