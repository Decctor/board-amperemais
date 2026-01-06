import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TCampaignState } from "@/schemas/campaigns";
import { TimeDurationUnitsEnum } from "@/schemas/enums";
import { CampaignTriggerTypeOptions, TimeDurationUnitsOptions } from "@/utils/select-options";
import { SparklesIcon } from "lucide-react";

type CampaignsTriggerBlockProps = {
	campaign: TCampaignState["campaign"];
	updateCampaign: (changes: Partial<TCampaignState["campaign"]>) => void;
};
export default function CampaignsTriggerBlock({ campaign, updateCampaign }: CampaignsTriggerBlockProps) {
	return (
		<ResponsiveMenuSection title="TRIGGER" icon={<SparklesIcon className="h-4 min-h-4 w-4 min-w-4" />}>
			<SelectInput
				label="TIPO DE GATILHO"
				value={campaign.gatilhoTipo}
				resetOptionLabel="SELECIONE O TIPO"
				options={CampaignTriggerTypeOptions}
				handleChange={(value) => updateCampaign({ gatilhoTipo: value })}
				onReset={() => updateCampaign({ gatilhoTipo: "NOVA-COMPRA" })}
				width="100%"
			/>
			{campaign.gatilhoTipo === "PERMANÊNCIA-SEGMENTAÇÃO" ? (
				<div className="w-full flex flex-col gap-2 items-center lg:flex-row">
					<div className="w-full lg:w-1/2">
						<SelectInput
							label="TEMPO DE PERMANÊNCIA (MEDIDA)"
							value={campaign.gatilhoTempoPermanenciaMedida}
							resetOptionLabel="SELECIONE A MEDIDA"
							options={TimeDurationUnitsOptions}
							handleChange={(value) => updateCampaign({ gatilhoTempoPermanenciaMedida: value })}
							onReset={() => updateCampaign({ gatilhoTempoPermanenciaMedida: null })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="TEMPO DE PERMANÊNCIA (VALOR)"
							value={campaign.gatilhoTempoPermanenciaValor ?? null}
							placeholder="Preencha aqui o valor do tempo de permanência..."
							handleChange={(value) => updateCampaign({ gatilhoTempoPermanenciaValor: value })}
							width="100%"
						/>
					</div>
				</div>
			) : null}
		</ResponsiveMenuSection>
	);
}
