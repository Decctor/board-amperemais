import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { CampaignExecutionDelayDirectionOptions, InteractionsCronJobTimeBlocksOptions, TimeDurationUnitsOptions } from "@/utils/select-options";
import { PlayIcon } from "lucide-react";

const TRIGGERS_SUPPORTING_ANTES = ["ANIVERSARIO_CLIENTE", "PIOR-DIA-VENDAS"] as const;

type CampaignsExecutionBlockProps = {
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
	campaignSegmentations: TUseCampaignState["state"]["segmentations"];
};
export default function CampaignsExecutionBlock({ campaign, updateCampaign, campaignSegmentations }: CampaignsExecutionBlockProps) {
	const isRecorrente = campaign.gatilhoTipo === "RECORRENTE";
	const isUsoUnico = campaign.gatilhoTipo === "USO-UNICO";
	const supportsAntes = (TRIGGERS_SUPPORTING_ANTES as readonly string[]).includes(campaign.gatilhoTipo);

	const descriptionText =
		campaign.execucaoAgendadaDirecao === "ANTES"
			? "Defina em quanto tempo antes do evento a automação será executada."
			: "Defina em quanto tempo deve ser executada a automação depois do gatilho ser ativado.";

	return (
		<ResponsiveMenuSection title="EXECUÇÃO" icon={<PlayIcon className="h-4 min-h-4 w-4 min-w-4" />}>
			{!isRecorrente && !isUsoUnico ? (
				<div className="w-full flex flex-col gap-1">
					<p className="text-center text-sm tracking-tigh text-muted-foreground">{descriptionText}</p>
					<div className="w-full flex items-center gap-2 flex-col lg:flex-row">
						{supportsAntes ? (
							<div className="w-full lg:w-1/3">
								<SelectInput
									label="DIREÇÃO"
									value={campaign.execucaoAgendadaDirecao}
									resetOptionLabel="SELECIONE A DIREÇÃO"
									options={CampaignExecutionDelayDirectionOptions}
									handleChange={(value) =>
										updateCampaign({ execucaoAgendadaDirecao: value as TUseCampaignState["state"]["campaign"]["execucaoAgendadaDirecao"] })
									}
									onReset={() => updateCampaign({ execucaoAgendadaDirecao: "DEPOIS" })}
									width="100%"
								/>
							</div>
						) : null}
						<div className={supportsAntes ? "w-full lg:w-1/3" : "w-full lg:w-1/2"}>
							<SelectInput
								label="MEDIDA"
								value={campaign.execucaoAgendadaMedida}
								resetOptionLabel="SELECIONE A MEDIDA"
								options={TimeDurationUnitsOptions}
								handleChange={(value) => updateCampaign({ execucaoAgendadaMedida: value as TUseCampaignState["state"]["campaign"]["execucaoAgendadaMedida"] })}
								onReset={() => updateCampaign({ execucaoAgendadaMedida: "DIAS" })}
								width="100%"
							/>
						</div>
						<div className={supportsAntes ? "w-full lg:w-1/3" : "w-full lg:w-1/2"}>
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
			) : null}
			<div className="w-full flex flex-col gap-1">
				<p className="text-center text-sm tracking-tigh text-muted-foreground">
					{isRecorrente
						? "Defina em qual bloco de horário a campanha recorrente será executada."
						: isUsoUnico
							? "Defina em qual bloco de horário a campanha de uso único será executada."
						: "Defina em qual bloco de horário deve ser executada a automação."}
				</p>
				<SelectInput
					label="BLOCO DE HORÁRIO"
					value={campaign.execucaoAgendadaBloco}
					resetOptionLabel="SELECIONE O BLOCO DE HORÁRIO"
					options={InteractionsCronJobTimeBlocksOptions}
					handleChange={(value) => updateCampaign({ execucaoAgendadaBloco: value as TUseCampaignState["state"]["campaign"]["execucaoAgendadaBloco"] })}
					onReset={() => updateCampaign({ execucaoAgendadaBloco: "06:00" })}
					width="100%"
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
