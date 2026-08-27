"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/nova-compra-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import NumberInput from "@/components/Inputs/NumberInput";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

export default function NovaCompraConfig() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
			<p className="text-xs text-muted-foreground">
				Opcionalmente, defina um valor mínimo. A campanha só dispara se a compra for maior ou igual ao valor.
			</p>
			<NumberInput
				label="VALOR MÍNIMO DE NOVA COMPRA (R$)"
				value={state.campaign.gatilhoNovaCompraValorMinimo ?? null}
				placeholder="Deixe vazio para qualquer valor"
				handleChange={(value) => updateCampaign({ gatilhoNovaCompraValorMinimo: value })}
			/>
		</div>
	);
}
