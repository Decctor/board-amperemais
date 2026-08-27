"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/recorrente-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import type { TRecurrenceFrequencyEnum } from "@/schemas/enums";
import { DaysOfWeekOptions, RecurrenceFrequencyOptions } from "@/utils/select-options";
import { useMemo } from "react";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

const DaysOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({
	id: i + 1,
	label: String(i + 1),
	value: String(i + 1),
}));

function parseDaysJson(value: string | null | undefined): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.map(String) : [];
	} catch {
		return [];
	}
}

export default function RecorrenteConfig() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
	const { campaign } = state;

	const selectedDiasSemana = useMemo(() => parseDaysJson(campaign.recorrenciaDiasSemana), [campaign.recorrenciaDiasSemana]);
	const selectedDiasMes = useMemo(() => parseDaysJson(campaign.recorrenciaDiasMes), [campaign.recorrenciaDiasMes]);

	const intervalLabel =
		campaign.recorrenciaTipo === "DIARIO"
			? "DIAS"
			: campaign.recorrenciaTipo === "SEMANAL"
				? "SEMANAS"
				: campaign.recorrenciaTipo === "MENSAL"
					? "MESES"
					: "UNIDADES";

	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4">
			<p className="text-xs text-muted-foreground">Configure a cadência da campanha recorrente.</p>
			<div className="flex w-full flex-col gap-3 lg:flex-row">
				<div className="w-full lg:w-1/2">
					<SelectInput
						label="FREQUÊNCIA"
						value={campaign.recorrenciaTipo}
						resetOptionLabel="SELECIONE A FREQUÊNCIA"
						options={RecurrenceFrequencyOptions}
						handleChange={(value) => updateCampaign({ recorrenciaTipo: value as TRecurrenceFrequencyEnum })}
						onReset={() => updateCampaign({ recorrenciaTipo: null })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						label={`A CADA (${intervalLabel})`}
						value={campaign.recorrenciaIntervalo ?? 1}
						placeholder="Ex: 1 para toda semana, 2 para a cada 2 semanas..."
						handleChange={(value) => updateCampaign({ recorrenciaIntervalo: value })}
					/>
				</div>
			</div>
			{campaign.recorrenciaTipo === "SEMANAL" ? (
				<MultipleSelectInput
					label="DIAS DA SEMANA"
					selected={selectedDiasSemana}
					resetOptionLabel="SELECIONE OS DIAS"
					options={DaysOfWeekOptions.map((o) => ({ ...o, value: String(o.value) }))}
					handleChange={(values) => updateCampaign({ recorrenciaDiasSemana: JSON.stringify(values.map(Number)) })}
					onReset={() => updateCampaign({ recorrenciaDiasSemana: null })}
				/>
			) : null}
			{campaign.recorrenciaTipo === "MENSAL" ? (
				<MultipleSelectInput
					label="DIAS DO MÊS"
					selected={selectedDiasMes}
					resetOptionLabel="SELECIONE OS DIAS"
					options={DaysOfMonthOptions}
					handleChange={(values) => updateCampaign({ recorrenciaDiasMes: JSON.stringify(values.map(Number)) })}
					onReset={() => updateCampaign({ recorrenciaDiasMes: null })}
				/>
			) : null}
		</div>
	);
}
