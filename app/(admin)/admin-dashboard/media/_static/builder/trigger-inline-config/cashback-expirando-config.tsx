"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/cashback-expirando-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import DurationInput from "@/components/Inputs/DurationInput";
import NumberInput from "@/components/Inputs/NumberInput";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { TimeDurationUnitsOptions } from "@/utils/select-options";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

export default function CashbackExpirandoConfig() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
			<p className="text-xs text-muted-foreground">
				Somamos o cashback que vence dentro da janela escolhida e só avisamos quando o total atingir o valor mínimo.
			</p>
			<DurationInput<TTimeDurationUnitsEnum>
				label="JANELA DE EXPIRAÇÃO"
				value={state.campaign.gatilhoCashbackExpirandoAntecedenciaValor ?? null}
				measure={state.campaign.gatilhoCashbackExpirandoAntecedenciaMedida}
				options={TimeDurationUnitsOptions}
				valuePlaceholder="Ex: 7"
				measurePlaceholder="Medida"
				onValueChange={(value) => updateCampaign({ gatilhoCashbackExpirandoAntecedenciaValor: value })}
				onMeasureChange={(value) => updateCampaign({ gatilhoCashbackExpirandoAntecedenciaMedida: value })}
				onMeasureReset={() => updateCampaign({ gatilhoCashbackExpirandoAntecedenciaMedida: null })}
				helperText="Ex.: 3 dias considera o cashback que vence de hoje até o fim dos próximos 3 dias."
			/>
			<div className="flex w-full flex-col gap-1">
				<NumberInput
					label="VALOR MÍNIMO PARA AVISAR"
					value={state.campaign.gatilhoCashbackExpirandoValorMinimo ?? null}
					placeholder="Ex: 10"
					handleChange={(value) => updateCampaign({ gatilhoCashbackExpirandoValorMinimo: value })}
				/>
				<p className="text-xs text-muted-foreground">Se o cliente tiver menos que esse valor expirando na janela, nenhuma mensagem será criada.</p>
			</div>
		</div>
	);
}
