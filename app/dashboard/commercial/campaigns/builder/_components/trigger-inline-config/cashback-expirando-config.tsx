"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { TimeDurationUnitsOptions } from "@/utils/select-options";
import { useBuilderCampaign } from "../builder-provider";

export default function CashbackExpirandoConfig() {
	const { state, updateCampaign } = useBuilderCampaign();
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-primary/10 bg-card px-4 py-3">
			<p className="text-xs text-muted-foreground">
				Configure com qual antecedência queremos avisar o cliente que o cashback dele está prestes a expirar.
			</p>
			<div className="flex w-full flex-col gap-2 lg:flex-row">
				<div className="w-full lg:w-1/2">
					<SelectInput
						label="MEDIDA"
						value={state.campaign.gatilhoCashbackExpirandoAntecedenciaMedida}
						resetOptionLabel="SELECIONE A MEDIDA"
						options={TimeDurationUnitsOptions}
						handleChange={(value) =>
							updateCampaign({ gatilhoCashbackExpirandoAntecedenciaMedida: value as TTimeDurationUnitsEnum })
						}
						onReset={() => updateCampaign({ gatilhoCashbackExpirandoAntecedenciaMedida: null })}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="VALOR"
						value={state.campaign.gatilhoCashbackExpirandoAntecedenciaValor ?? null}
						placeholder="Ex: 3 (avisar 3 dias antes)"
						handleChange={(value) => updateCampaign({ gatilhoCashbackExpirandoAntecedenciaValor: value })}
						width="100%"
					/>
				</div>
			</div>
		</div>
	);
}
