"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/valor-total-compras-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import NumberInput from "@/components/Inputs/NumberInput";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

export default function ValorTotalComprasConfig() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
			<p className="text-xs text-muted-foreground">A campanha dispara quando o cliente acumular o valor total de compras informado.</p>
			<NumberInput
				label="VALOR TOTAL DE COMPRAS (R$)"
				value={state.campaign.gatilhoValorTotalCompras ?? null}
				placeholder="Ex: 1000 (disparar quando atingir R$ 1.000 em compras)"
				handleChange={(value) => updateCampaign({ gatilhoValorTotalCompras: value })}
			/>
		</div>
	);
}
