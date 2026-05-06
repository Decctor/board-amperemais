"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { TimeDurationUnitsOptions } from "@/utils/select-options";
import { useBuilderCampaign } from "../builder-provider";
import SegmentationsPanel from "../segmentations-panel";

export default function PermanenciaSegmentacaoConfig() {
	const { state, updateCampaign } = useBuilderCampaign();
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-primary/10 bg-card p-4">
			<p className="text-xs text-muted-foreground">
				Defina por quanto tempo o cliente precisa permanecer em uma das segmentações monitoradas para que a campanha seja
				disparada.
			</p>
			<div className="flex w-full flex-col gap-3 lg:flex-row">
				<div className="w-full lg:w-1/2">
					<SelectInput
						label="TEMPO DE PERMANÊNCIA (MEDIDA)"
						value={state.campaign.gatilhoTempoPermanenciaMedida}
						resetOptionLabel="SELECIONE A MEDIDA"
						options={TimeDurationUnitsOptions}
						handleChange={(value) =>
							updateCampaign({ gatilhoTempoPermanenciaMedida: value as TTimeDurationUnitsEnum })
						}
						onReset={() => updateCampaign({ gatilhoTempoPermanenciaMedida: null })}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="TEMPO DE PERMANÊNCIA (VALOR)"
						value={state.campaign.gatilhoTempoPermanenciaValor ?? null}
						placeholder="Ex: 30 — dispara após 30 dias na segmentação"
						handleChange={(value) => updateCampaign({ gatilhoTempoPermanenciaValor: value })}
						width="100%"
					/>
				</div>
			</div>
			<SegmentationsPanel
				title="SEGMENTAÇÕES MONITORADAS"
				description="Selecione as segmentações que serão acompanhadas pelo gatilho."
			/>
		</div>
	);
}
