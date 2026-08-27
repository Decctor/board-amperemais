"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/cashback-acumulado-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import NumberInput from "@/components/Inputs/NumberInput";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

export default function CashbackAcumuladoConfig() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
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
