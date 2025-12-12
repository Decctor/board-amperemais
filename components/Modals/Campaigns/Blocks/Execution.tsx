import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { InteractionsCronJobTimeBlocksOptions, TimeDurationUnitsOptions } from "@/utils/select-options";
import { PlayIcon } from "lucide-react";

type CampaignsExecutionBlockProps = {
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
	campaignSegmentations: TUseCampaignState["state"]["segmentations"];
};
export default function CampaignsExecutionBlock({ campaign, updateCampaign, campaignSegmentations }: CampaignsExecutionBlockProps) {
	return (
		<ResponsiveMenuSection title="EXECUÇÃO" icon={<PlayIcon className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col gap-1">
				<p className="text-center text-sm tracking-tigh text-muted-foreground">
					Defina em quanto tempo deve ser executada a automação depois do gatilho ser ativado.
				</p>
				<div className="w-full flex items-center gap-2 flex-col lg:flex-row">
					<div className="w-full lg:w-1/2">
						<SelectInput
							label="MEDIDA"
							value={campaign.execucaoAgendadaMedida}
							selectedItemLabel="SELECIONE A MEDIDA"
							options={TimeDurationUnitsOptions}
							handleChange={(value) => updateCampaign({ execucaoAgendadaMedida: value })}
							onReset={() => updateCampaign({ execucaoAgendadaMedida: "DIAS" })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="VALOR"
							value={campaign.execucaoAgendadaValor}
							placeholder="Preencha aqui o valor do tempo de execução..."
							handleChange={(value) => updateCampaign({ execucaoAgendadaValor: value })}
							width="100%"
						/>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col gap-1">
				<p className="text-center text-sm tracking-tigh text-muted-foreground">Defina em qual bloco de horário deve ser executada a automação.</p>
				<SelectInput
					label="BLOCO DE HORÁRIO"
					value={campaign.execucaoAgendadaBloco}
					selectedItemLabel="SELECIONE O BLOCO DE HORÁRIO"
					options={InteractionsCronJobTimeBlocksOptions}
					handleChange={(value) => updateCampaign({ execucaoAgendadaBloco: value })}
					onReset={() => updateCampaign({ execucaoAgendadaBloco: "06:00" })}
					width="100%"
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
