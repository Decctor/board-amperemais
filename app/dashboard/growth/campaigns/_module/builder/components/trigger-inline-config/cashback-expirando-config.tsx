"use client";

import DurationInput from "@/components/Inputs/DurationInput";
import NumberInput from "@/components/Inputs/NumberInput";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { TimeDurationUnitsOptions } from "@/utils/select-options";
import { useBuilderCampaign } from "../builder-provider";

export default function CashbackExpirandoConfig() {
	const { state, updateCampaign } = useBuilderCampaign();
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
