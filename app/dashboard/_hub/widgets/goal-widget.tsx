"use client";

import { GoalTrackingBar } from "@/components/Stats/GoalTrackingBar";
import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useGoalsStats } from "@/lib/queries/goals";
import { Goal } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

const PACING_LABELS = {
	ADIANTADO: { label: "Adiantada", tone: "success" as const },
	NO_RITMO: { label: "No ritmo", tone: "default" as const },
	ATRASADO: { label: "Atrasada", tone: "destructive" as const },
};

export function GoalWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useGoalsStats();
	const goal = data?.activeGoal ?? null;
	const pacing = goal ? PACING_LABELS[goal.ritmo.situacao] : null;

	return (
		<HubWidget href={appRoutes.management.goals()}>
			<HubWidget.Header icon={<Goal />} title="Meta" hint={goal ? `Dia ${goal.ritmo.diaAtualDoPeriodo} de ${goal.ritmo.totalDias}` : undefined} />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : !goal ? (
				<HubWidget.Empty message="Nenhuma meta ativa no momento." />
			) : (
				<>
					<HubWidget.Value label={`${Math.round(goal.percentualValor)}% da meta`}>{formatToMoney(goal.realizadoValor)}</HubWidget.Value>
					{/* Âmbar só em celebração (DESIGN.md): a barra fica dourada ao bater a meta. */}
					<GoalTrackingBar
						valueGoal={goal.objetivoValor}
						valueHit={goal.realizadoValor}
						formattedValueGoal={formatToMoney(goal.objetivoValor)}
						formattedValueHit={formatToMoney(goal.realizadoValor)}
						barHeight="0.5rem"
						barClassName={goal.percentualValor >= 100 ? "bg-[#ffb900]" : "bg-primary"}
					/>
					<HubWidget.Details>{pacing ? <HubWidget.Detail label="Ritmo" value={pacing.label} tone={pacing.tone} /> : null}</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
