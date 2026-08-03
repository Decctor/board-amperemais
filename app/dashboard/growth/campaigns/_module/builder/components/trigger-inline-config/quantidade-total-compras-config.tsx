"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import { useBuilderCampaign } from "../builder-provider";

export default function QuantidadeTotalComprasConfig() {
	const { state, updateCampaign } = useBuilderCampaign();
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
