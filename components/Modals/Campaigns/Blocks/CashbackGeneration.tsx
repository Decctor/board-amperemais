import CheckboxInput from "@/components/Inputs/CheckboxInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TCashbackProgramAccumulationTypeEnum, TTimeDurationUnitsEnum } from "@/schemas/enums";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { CashbackProgramAccumulationTypeOptions, TimeDurationUnitsOptions } from "@/utils/select-options";
import { Coins } from "lucide-react";

type CampaignsCashbackGenerationBlockProps = {
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
};

const TRIGGERS_WITH_SALE_VALUE = ["NOVA-COMPRA", "PRIMEIRA-COMPRA"];

export default function CampaignsCashbackGenerationBlock({ campaign, updateCampaign }: CampaignsCashbackGenerationBlockProps) {
	const canUsePercentual = TRIGGERS_WITH_SALE_VALUE.includes(campaign.gatilhoTipo);

	// Filter options based on trigger type
	const availableTypeOptions = canUsePercentual
		? CashbackProgramAccumulationTypeOptions
		: CashbackProgramAccumulationTypeOptions.filter((option) => option.value === "FIXO");

	// Reset to FIXO if current type is PERCENTUAL and trigger doesn't support it
	const handleTriggerTypeChange = () => {
		if (!canUsePercentual && campaign.cashbackGeracaoTipo === "PERCENTUAL") {
			updateCampaign({ cashbackGeracaoTipo: "FIXO" });
		}
	};

	// Call this effect when trigger changes
	if (!canUsePercentual && campaign.cashbackGeracaoTipo === "PERCENTUAL") {
		handleTriggerTypeChange();
	}

	return (
		<ResponsiveMenuSection title="GERAÇÃO DE CASHBACK" icon={<Coins className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col gap-1">
				<p className="text-center text-sm tracking-tight text-muted-foreground">
					Configure a geração automática de cashback para clientes que ativarem esta campanha.
				</p>
				<CheckboxInput
					checked={!!campaign.cashbackGeracaoAtivo}
					labelTrue="GERAR CASHBACK"
					labelFalse="GERAR CASHBACK"
					handleChange={(value) => updateCampaign({ cashbackGeracaoAtivo: value })}
				/>

				{campaign.cashbackGeracaoAtivo ? (
					<div className="w-full flex flex-col gap-2">
						<div className="w-full flex flex-col gap-2 items-center lg:flex-row">
							<div className="w-full lg:w-1/2">
								<SelectInput
									label="TIPO DE CASHBACK"
									value={campaign.cashbackGeracaoTipo}
									resetOptionLabel="SELECIONE O TIPO"
									options={availableTypeOptions}
									handleChange={(value) => updateCampaign({ cashbackGeracaoTipo: value as TCashbackProgramAccumulationTypeEnum })}
									onReset={() => updateCampaign({ cashbackGeracaoTipo: null })}
									width="100%"
								/>
							</div>
							<div className="w-full lg:w-1/2">
								<NumberInput
									label={campaign.cashbackGeracaoTipo === "PERCENTUAL" ? "PERCENTUAL (%)" : "VALOR (R$)"}
									value={campaign.cashbackGeracaoValor ?? null}
									placeholder={
										campaign.cashbackGeracaoTipo === "PERCENTUAL"
											? "Ex: 5 para 5% de cashback..."
											: "Ex: 10 para R$ 10,00 de cashback..."
									}
									handleChange={(value) => updateCampaign({ cashbackGeracaoValor: value })}
									width="100%"
								/>
							</div>
						</div>

						{!canUsePercentual && (
							<p className="text-xs text-amber-600 text-center">
								O tipo PERCENTUAL só está disponível para gatilhos de NOVA COMPRA ou PRIMEIRA COMPRA.
							</p>
						)}

						<div className="w-full flex flex-col gap-2 items-center lg:flex-row">
							<div className="w-full lg:w-1/2">
								<SelectInput
									label="EXPIRAÇÃO (MEDIDA)"
									value={campaign.cashbackGeracaoExpiracaoMedida}
									resetOptionLabel="SELECIONE A MEDIDA"
									options={TimeDurationUnitsOptions}
									handleChange={(value) => updateCampaign({ cashbackGeracaoExpiracaoMedida: value as TTimeDurationUnitsEnum })}
									onReset={() => updateCampaign({ cashbackGeracaoExpiracaoMedida: null })}
									width="100%"
								/>
							</div>
							<div className="w-full lg:w-1/2">
								<NumberInput
									label="EXPIRAÇÃO (VALOR)"
									value={campaign.cashbackGeracaoExpiracaoValor ?? null}
									placeholder="Ex: 30 para expirar em 30 dias..."
									handleChange={(value) => updateCampaign({ cashbackGeracaoExpiracaoValor: value })}
									width="100%"
								/>
							</div>
						</div>
						<p className="text-xs text-muted-foreground text-center">
							Se a expiração não for configurada, será usado o padrão de 30 dias.
						</p>
					</div>
				) : null}
			</div>
		</ResponsiveMenuSection>
	);
}
