"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import { useBuilderCampaign } from "../builder-provider";

export default function NovaCompraConfig() {
	const { state, updateCampaign } = useBuilderCampaign();
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-primary/10 bg-card px-4 py-3">
			<p className="text-xs text-muted-foreground">
				Opcionalmente, defina um valor mínimo. A campanha só dispara se a compra for maior ou igual ao valor.
			</p>
			<NumberInput
				label="VALOR MÍNIMO DE NOVA COMPRA (R$)"
				value={state.campaign.gatilhoNovaCompraValorMinimo ?? null}
				placeholder="Deixe vazio para qualquer valor"
				handleChange={(value) => updateCampaign({ gatilhoNovaCompraValorMinimo: value })}
				width="100%"
			/>
		</div>
	);
}
