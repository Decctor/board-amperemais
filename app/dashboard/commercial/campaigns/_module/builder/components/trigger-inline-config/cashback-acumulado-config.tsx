"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import { useBuilderCampaign } from "../builder-provider";

export default function CashbackAcumuladoConfig() {
	const { state, updateCampaign } = useBuilderCampaign();
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
			<p className="text-xs text-muted-foreground">
				Defina os limites para o disparo. Pode ser combinação de novo cashback acumulado e total acumulado.
			</p>
			<div className="flex w-full flex-col gap-2 lg:flex-row">
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="VALOR MÍNIMO DE NOVO CASHBACK"
						value={state.campaign.gatilhoNovoCashbackAcumuladoValorMinimo ?? null}
						placeholder="Ex: 5 (R$ 5 acumulados na operação)"
						handleChange={(value) => updateCampaign({ gatilhoNovoCashbackAcumuladoValorMinimo: value })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="VALOR MÍNIMO DE CASHBACK TOTAL"
						value={state.campaign.gatilhoTotalCashbackAcumuladoValorMinimo ?? null}
						placeholder="Ex: 50 (R$ 50 totais já acumulados)"
						handleChange={(value) => updateCampaign({ gatilhoTotalCashbackAcumuladoValorMinimo: value })}
					/>
				</div>
			</div>
		</div>
	);
}
