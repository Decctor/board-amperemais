"use client";

import DateInput from "@/components/Inputs/DateInput";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import { countPeriodDays } from "@/lib/goals/pacing";
import {
	formatGoalPeriodSummary,
	GOAL_PERIOD_PRESETS,
	matchGoalPeriodPreset,
	type TGoalPeriodPresetId,
	type TGoalPeriodRange,
} from "@/lib/goals/periods";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { CalendarRange, TriangleAlert } from "lucide-react";
import { useState } from "react";

/**
 * Escolha do período da meta.
 *
 * Na prática o lojista pensa em mês fechado, então o preset é o controle e as datas são a
 * confirmação — não o contrário. Os dois campos de data só aparecem em "Personalizado": mostrar
 * quatro controles quando três em cada quatro metas são "este mês" cobra atenção sem devolver nada.
 */

type OverlappingGoal = { id: string; dataInicio: Date | string; dataFim: Date | string };

type PeriodPresetsProps = {
	range: TGoalPeriodRange;
	updateRange: (range: TGoalPeriodRange) => void;
	overlappingGoals: OverlappingGoal[];
};

export default function PeriodPresets({ range, updateRange, overlappingGoals }: PeriodPresetsProps) {
	// O preset detectado a partir do intervalo salvo vira o estado inicial, para o modal de edição
	// de uma meta mensal não abrir sempre em "Personalizado".
	const [selectedPreset, setSelectedPreset] = useState<TGoalPeriodPresetId>(() => matchGoalPeriodPreset(range));
	const totalDias = countPeriodDays({ dataInicio: range.dataInicio, dataFim: range.dataFim });
	const isCustom = selectedPreset === "PERSONALIZADO";

	function selectPreset(presetId: TGoalPeriodPresetId) {
		setSelectedPreset(presetId);
		if (presetId === "PERSONALIZADO") return;
		const preset = GOAL_PERIOD_PRESETS.find((item) => item.id === presetId);
		if (preset) updateRange(preset.resolve(new Date()));
	}

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<p className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Período da meta</p>
				<div className="flex flex-wrap gap-1.5">
					{[...GOAL_PERIOD_PRESETS.map((preset) => ({ id: preset.id as TGoalPeriodPresetId, label: preset.label })), {
						id: "PERSONALIZADO" as const,
						label: "Personalizado",
					}].map((preset) => {
						const isSelected = selectedPreset === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								aria-pressed={isSelected}
								onClick={() => selectPreset(preset.id)}
								className={cn(
									"rounded-full border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40",
									isSelected
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-transparent text-foreground hover:bg-muted/60",
								)}
							>
								{preset.label}
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
				<CalendarRange className="h-4 min-h-4 w-4 min-w-4 shrink-0 text-muted-foreground" />
				<p className="text-xs font-semibold tabular-nums">{formatGoalPeriodSummary(range, totalDias)}</p>
			</div>

			{isCustom ? (
				<div className="flex w-full flex-col gap-3">
					<DateInput
						label="DATA DE INÍCIO"
						value={formatDateForInputValue(range.dataInicio)}
						handleChange={(value) => {
							const dataInicio = formatDateOnInputChange(value, "date", "start");
							if (dataInicio) updateRange({ ...range, dataInicio: dataInicio as Date });
						}}
					/>
					<DateInput
						label="DATA DE FIM"
						value={formatDateForInputValue(range.dataFim)}
						handleChange={(value) => {
							const dataFim = formatDateOnInputChange(value, "date", "end");
							if (dataFim) updateRange({ ...range, dataFim: dataFim as Date });
						}}
					/>
				</div>
			) : null}

			{totalDias === 0 ? (
				<p className="text-xs font-semibold text-destructive">A data de fim precisa ser igual ou posterior à data de início.</p>
			) : null}

			{/* O modelo permite metas sobrepostas, mas o dashboard resolve a meta ativa com um `find` e
			    só mostra uma. Avisar é honesto; bloquear seria inventar uma regra que o banco não tem. */}
			{overlappingGoals.length > 0 ? (
				<div className="flex gap-2 rounded-lg border border-brand/35 bg-brand/10 px-3 py-2.5">
					<TriangleAlert className="mt-0.5 h-4 min-h-4 w-4 min-w-4 shrink-0" />
					<div className="flex flex-col gap-1">
						<p className="text-xs font-bold">
							{overlappingGoals.length === 1 ? "Já existe uma meta neste período." : `Já existem ${overlappingGoals.length} metas neste período.`}
						</p>
						<p className="text-xs text-muted-foreground">
							{overlappingGoals
								.slice(0, 3)
								.map((goal) => `${dayjs(goal.dataInicio).format("DD/MM/YY")} → ${dayjs(goal.dataFim).format("DD/MM/YY")}`)
								.join(", ")}
							. Com duas metas ativas ao mesmo tempo, o painel mostra apenas uma delas.
						</p>
					</div>
				</div>
			) : null}
		</div>
	);
}
