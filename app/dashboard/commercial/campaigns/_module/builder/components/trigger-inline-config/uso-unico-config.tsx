"use client";

import DateInput from "@/components/Inputs/DateInput";
import { useBuilderCampaign } from "../builder-provider";

export default function UsoUnicoConfig() {
	const { state, updateCampaign } = useBuilderCampaign();
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-4">
			<p className="text-xs text-muted-foreground">
				A campanha será disparada uma única vez na data selecionada e no bloco de horário configurado na etapa de Envio.
			</p>
			<DateInput
				label="DATA DO DISPARO"
				value={state.campaign.gatilhoUsoUnicoDataReferencia ?? undefined}
				handleChange={(value) => updateCampaign({ gatilhoUsoUnicoDataReferencia: value ?? null })}
			/>
		</div>
	);
}
