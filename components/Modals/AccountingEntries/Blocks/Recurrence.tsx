"use client";

import CheckboxInput from "@/components/Inputs/CheckboxInput";
import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import type { TFinancialRecurringRuleConfig } from "@/schemas/financial-recurring";
import { CalendarClock } from "lucide-react";

type RecurrenceBlockProps = {
	config: TFinancialRecurringRuleConfig | null;
	onChange: (config: TFinancialRecurringRuleConfig | null) => void;
	editable?: boolean;
};

const FREQUENCY_OPTIONS = [
	{ id: "DIARIA", value: "DIARIA", label: "DIÁRIA" },
	{ id: "SEMANAL", value: "SEMANAL", label: "SEMANAL" },
	{ id: "MENSAL", value: "MENSAL", label: "MENSAL" },
	{ id: "ANUAL", value: "ANUAL", label: "ANUAL" },
];
const WEEKDAY_OPTIONS = [
	{ id: 0, value: "0", label: "DOMINGO" },
	{ id: 1, value: "1", label: "SEGUNDA-FEIRA" },
	{ id: 2, value: "2", label: "TERÇA-FEIRA" },
	{ id: 3, value: "3", label: "QUARTA-FEIRA" },
	{ id: 4, value: "4", label: "QUINTA-FEIRA" },
	{ id: 5, value: "5", label: "SEXTA-FEIRA" },
	{ id: 6, value: "6", label: "SÁBADO" },
];

export function AccountingEntryRecurrenceBlock({ config, onChange, editable = true }: RecurrenceBlockProps) {
	const enabled = !!config;
	const current = config ?? {
		frequencia: "MENSAL" as const,
		intervalo: 1,
		inicio: new Date(),
		fim: null,
		diaDoMes: new Date().getDate(),
		diaDaSemana: null,
		gerarComAntecedenciaDias: 90,
		timezone: "America/Sao_Paulo",
	};

	function update(patch: Partial<TFinancialRecurringRuleConfig>) {
		onChange({ ...current, ...patch });
	}

	return (
		<ResponsiveMenuSection title="RECORRÊNCIA" icon={<CalendarClock className="h-4 w-4" />}>
			<CheckboxInput
				checked={enabled}
				labelTrue="LANÇAMENTO RECORRENTE ATIVO"
				labelFalse="TORNAR ESTE LANÇAMENTO RECORRENTE"
				description="As próximas ocorrências serão materializadas automaticamente pelo cron financeiro."
				handleChange={(value) => onChange(value ? current : null)}
				editable={editable}
			/>
			{enabled ? (
				<div className="flex flex-col gap-3">
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
						<SelectInput
							label="FREQUÊNCIA"
							value={current.frequencia}
							options={FREQUENCY_OPTIONS}
							resetOptionLabel="MENSAL"
							handleChange={(value) => update({ frequencia: value as TFinancialRecurringRuleConfig["frequencia"] })}
							onReset={() => update({ frequencia: "MENSAL" })}
							editable={editable}
						/>
						<NumberInput
							label="INTERVALO"
							placeholder="1"
							value={current.intervalo}
							handleChange={(intervalo) => update({ intervalo: Math.max(1, Math.trunc(intervalo)) })}
							editable={editable}
						/>
					</div>
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
						<DateInput
							label="INÍCIO"
							value={formatDateForInputValue(current.inicio)}
							handleChange={(value) => update({ inicio: formatDateOnInputChange(value, "date") ?? current.inicio })}
							editable={editable}
							required
						/>
						<DateInput
							label="FIM (OPCIONAL)"
							value={current.fim ? formatDateForInputValue(current.fim) : undefined}
							handleChange={(value) => update({ fim: value ? formatDateOnInputChange(value, "date") : null })}
							editable={editable}
						/>
					</div>
					{current.frequencia === "SEMANAL" ? (
						<SelectInput
							label="DIA DA SEMANA"
							value={current.diaDaSemana === null || current.diaDaSemana === undefined ? null : String(current.diaDaSemana)}
							options={WEEKDAY_OPTIONS}
							resetOptionLabel="DIA DA SEMANA DA DATA DE INÍCIO"
							handleChange={(value) => update({ diaDaSemana: Number(value) })}
							onReset={() => update({ diaDaSemana: null })}
							editable={editable}
						/>
					) : null}
					{current.frequencia === "MENSAL" || current.frequencia === "ANUAL" ? (
						<NumberInput
							label="DIA DO MÊS"
							placeholder="1"
							value={current.diaDoMes ?? 1}
							handleChange={(diaDoMes) => update({ diaDoMes: Math.min(31, Math.max(1, Math.trunc(diaDoMes))) })}
							editable={editable}
						/>
					) : null}
					<NumberInput
						label="GERAR COM ANTECEDÊNCIA (DIAS)"
						placeholder="90"
						value={current.gerarComAntecedenciaDias}
						handleChange={(gerarComAntecedenciaDias) =>
							update({ gerarComAntecedenciaDias: Math.min(730, Math.max(0, Math.trunc(gerarComAntecedenciaDias))) })
						}
						editable={editable}
					/>
				</div>
			) : null}
		</ResponsiveMenuSection>
	);
}
