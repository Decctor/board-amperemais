import CheckboxInput from "@/components/Inputs/CheckboxInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import { Button } from "@/components/ui/button";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { cn } from "@/lib/utils";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { TimeDurationUnitsOptions } from "@/utils/select-options";
import { SettingsIcon } from "lucide-react";
import { useMemo } from "react";

type CampaignsConfigBlockProps = {
  campaign: TUseCampaignState["state"]["campaign"];
  updateCampaign: TUseCampaignState["updateCampaign"];
};
export default function CampaignsConfigBlock({
  campaign,
  updateCampaign,
}: CampaignsConfigBlockProps) {
  const isCustomMessageSendingLimit = useMemo(() => {
    return (
      campaign.limiteEnviosSemanais !== null &&
      campaign.limiteEnviosSemanais !== 300 &&
      campaign.limiteEnviosSemanais !== 500 &&
      campaign.limiteEnviosSemanais !== 1000
    );
  }, [campaign.limiteEnviosSemanais]);
  return (
    <ResponsiveMenuSection
      title="CONFIGURAÇÕES"
      icon={<SettingsIcon className="h-4 min-h-4 w-4 min-w-4" />}
    >
      <div className="w-full flex flex-col gap-1">
        <p className="text-center text-sm tracking-tigh text-muted-foreground">
          Defina detalhes de configurações da campanha.
        </p>
        <CheckboxInput
          checked={!!campaign.permitirRecorrencia}
          labelTrue="PERMITIR RECORRÊNCIA"
          labelFalse="PERMITIR RECORRÊNCIA"
          handleChange={(value) => updateCampaign({ permitirRecorrencia: value })}
        />

        {campaign.permitirRecorrencia ? (
          <div className="w-full flex flex-col gap-2 items-center lg:flex-row">
            <div className="w-full lg:w-1/2">
              <SelectInput
                label="FREQUÊNCIA DE INTERVALO (MEDIDA)"
                value={campaign.frequenciaIntervaloMedida}
                resetOptionLabel="SELECIONE A MEDIDA"
                options={TimeDurationUnitsOptions}
                handleChange={(value) =>
                  updateCampaign({ frequenciaIntervaloMedida: value as TTimeDurationUnitsEnum })
                }
                onReset={() => updateCampaign({ frequenciaIntervaloMedida: "DIAS" })}
                width="100%"
              />
            </div>
            <div className="w-full lg:w-1/2">
              <NumberInput
                label="FREQUÊNCIA DE INTERVALO (VALOR)"
                value={campaign.frequenciaIntervaloValor ?? null}
                placeholder="Preencha aqui o valor do tempo de permanência..."
                handleChange={(value) => updateCampaign({ frequenciaIntervaloValor: value })}
                width="100%"
              />
            </div>
          </div>
        ) : null}
        {campaign.permitirRecorrencia &&
        (!campaign.frequenciaIntervaloValor || campaign.frequenciaIntervaloValor <= 0) ? (
          <div className="w-full rounded-md border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-900">
            Defina uma frequência de intervalo maior que zero para evitar envios em toda execução da
            automação.
          </div>
        ) : null}
        <div className={"flex w-full flex-col gap-1"}>
          <h3 className={cn("text-sm font-medium tracking-tight text-primary/80")}>
            LIMITE DE ENVIOS POR SEMANA
          </h3>

          <div className="w-full flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
            <Button
              variant={campaign.limiteEnviosSemanais === null ? "default" : "ghost"}
              size={"fit"}
              className={cn("px-2 py-1 rounded-lg text-xs", {
                "opacity-100": campaign.limiteEnviosSemanais === null,
                "opacity-50": campaign.limiteEnviosSemanais !== null,
              })}
              onClick={() => updateCampaign({ limiteEnviosSemanais: null })}
            >
              SEM LIMITE
            </Button>
            <Button
              variant={campaign.limiteEnviosSemanais === 300 ? "default" : "ghost"}
              size={"fit"}
              className={cn("px-2 py-1 rounded-lg text-xs", {
                "opacity-100": campaign.limiteEnviosSemanais === 300,
                "opacity-50": campaign.limiteEnviosSemanais !== 300,
              })}
              onClick={() => updateCampaign({ limiteEnviosSemanais: 300 })}
            >
              300
            </Button>
            <Button
              variant={campaign.limiteEnviosSemanais === 500 ? "default" : "ghost"}
              size={"fit"}
              className={cn("px-2 py-1 rounded-lg text-xs", {
                "opacity-100": campaign.limiteEnviosSemanais === 500,
                "opacity-50": campaign.limiteEnviosSemanais !== 500,
              })}
              onClick={() => updateCampaign({ limiteEnviosSemanais: 500 })}
            >
              500
            </Button>
            <Button
              variant={campaign.limiteEnviosSemanais === 1000 ? "default" : "ghost"}
              size={"fit"}
              className={cn("px-2 py-1 rounded-lg text-xs", {
                "opacity-100": campaign.limiteEnviosSemanais === 1000,
                "opacity-50": campaign.limiteEnviosSemanais !== 1000,
              })}
              onClick={() => updateCampaign({ limiteEnviosSemanais: 1000 })}
            >
              1000
            </Button>
            <Button
              variant={
                campaign.limiteEnviosSemanais !== null &&
                campaign.limiteEnviosSemanais !== 300 &&
                campaign.limiteEnviosSemanais !== 500 &&
                campaign.limiteEnviosSemanais !== 1000
                  ? "default"
                  : "ghost"
              }
              size={"fit"}
              className={cn("px-2 py-1 rounded-lg text-xs", {
                "opacity-100": isCustomMessageSendingLimit,
                "opacity-50": !isCustomMessageSendingLimit,
              })}
              onClick={() => updateCampaign({ limiteEnviosSemanais: 1500 })}
            >
              PERSONALIZADO
            </Button>
          </div>
          {isCustomMessageSendingLimit ? (
            <NumberInput
              label="LIMITE DE ENVIOS POR SEMANA"
              showLabel={false}
              value={campaign.limiteEnviosSemanais ?? null}
              placeholder="Preencha aqui o valor do limite de envios por semana..."
              handleChange={(value) => updateCampaign({ limiteEnviosSemanais: value })}
              width="100%"
            />
          ) : null}
        </div>
      </div>
    </ResponsiveMenuSection>
  );
}
