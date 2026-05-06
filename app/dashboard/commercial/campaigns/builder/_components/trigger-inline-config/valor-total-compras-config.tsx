"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import { useBuilderCampaign } from "../builder-provider";

export default function ValorTotalComprasConfig() {
	const { state, updateCampaign } = useBuilderCampaign();
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-primary/10 bg-card px-4 py-3">
			<p className="text-xs text-muted-foreground">
				A campanha dispara quando o cliente acumular o valor total de compras informado.
			</p>
			<NumberInput
				label="VALOR TOTAL DE COMPRAS (R$)"
				value={state.campaign.gatilhoValorTotalCompras ?? null}
				placeholder="Ex: 1000 (disparar quando atingir R$ 1.000 em compras)"
				handleChange={(value) => updateCampaign({ gatilhoValorTotalCompras: value })}
				width="100%"
			/>
		</div>
	);
}
