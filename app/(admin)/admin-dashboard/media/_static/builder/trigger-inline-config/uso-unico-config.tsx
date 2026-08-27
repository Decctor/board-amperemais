"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/uso-unico-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import DateInput from "@/components/Inputs/DateInput";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

export default function UsoUnicoConfig() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
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
