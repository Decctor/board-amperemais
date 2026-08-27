"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/quantidade-total-compras-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import NumberInput from "@/components/Inputs/NumberInput";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

export default function QuantidadeTotalComprasConfig() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
			<p className="text-xs text-muted-foreground">A campanha dispara quando o cliente acumular a quantidade total de compras informada.</p>
			<NumberInput
				label="QUANTIDADE TOTAL DE COMPRAS"
				value={state.campaign.gatilhoQuantidadeTotalCompras ?? null}
				placeholder="Ex: 2 (segunda compra), 3 (terceira compra)..."
				handleChange={(value) => updateCampaign({ gatilhoQuantidadeTotalCompras: value })}
			/>
		</div>
	);
}
