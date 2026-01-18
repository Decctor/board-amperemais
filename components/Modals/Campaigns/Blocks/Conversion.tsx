import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TAttributionModelEnum } from "@/schemas/enums";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { AttributionModelOptions } from "@/utils/select-options";
import { ArrowRightLeftIcon } from "lucide-react";

type CampaignsConversionBlockProps = {
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
};
export default function CampaignsConversionBlock({ campaign, updateCampaign }: CampaignsConversionBlockProps) {
	return (
		<ResponsiveMenuSection title="CONFIGURAÇÕES DE CONVERSÃO" icon={<ArrowRightLeftIcon className="h-4 min-h-4 w-4 min-w-4" />}>
			<SelectInput
				value={campaign.atribuicaoModelo}
				label="MODELO DE ATRIBUIÇÃO"
				resetOptionLabel="NÃO DEFINIDO"
				onReset={() => updateCampaign({ atribuicaoModelo: "LAST_TOUCH" })}
				options={AttributionModelOptions}
				handleChange={(value) => updateCampaign({ atribuicaoModelo: value as TAttributionModelEnum })}
			/>
			<NumberInput
				value={campaign.atribuicaoJanelaDias}
				label="JANELA DE ATRIBUIÇÃO (DIAS)"
				placeholder="Preencha aqui a janela de atribuição..."
				handleChange={(value) => updateCampaign({ atribuicaoJanelaDias: value })}
				width="100%"
			/>
		</ResponsiveMenuSection>
	);
}
