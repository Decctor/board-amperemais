"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/permanencia-segmentacao-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import DurationInput from "@/components/Inputs/DurationInput";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { TimeDurationUnitsOptions } from "@/utils/select-options";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";
import SegmentationsPanel from "../segmentations-panel";

export default function PermanenciaSegmentacaoConfig() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4">
			<p className="text-xs text-muted-foreground">
				Defina por quanto tempo o cliente precisa permanecer em uma das segmentações monitoradas para que a campanha seja disparada.
			</p>
			<DurationInput<TTimeDurationUnitsEnum>
				label="TEMPO DE PERMANÊNCIA"
				value={state.campaign.gatilhoTempoPermanenciaValor ?? null}
				measure={state.campaign.gatilhoTempoPermanenciaMedida}
				options={TimeDurationUnitsOptions}
				valuePlaceholder="Ex: 30"
				measurePlaceholder="Medida"
				onValueChange={(value) => updateCampaign({ gatilhoTempoPermanenciaValor: value })}
				onMeasureChange={(value) => updateCampaign({ gatilhoTempoPermanenciaMedida: value })}
				onMeasureReset={() => updateCampaign({ gatilhoTempoPermanenciaMedida: null })}
				helperText="Dispara quando o cliente permanecer esse tempo em uma das segmentações monitoradas."
			/>
			<SegmentationsPanel title="SEGMENTAÇÕES MONITORADAS" description="Selecione as segmentações que serão acompanhadas pelo gatilho." />
		</div>
	);
}
