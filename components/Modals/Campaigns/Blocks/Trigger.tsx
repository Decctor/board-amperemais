import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TCampaignState } from "@/schemas/campaigns";
import type { TCampaignTriggerTypeEnum, TTimeDurationUnitsEnum } from "@/schemas/enums";
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
				handleChange={(value) => updateCampaign({ gatilhoTipo: value as TCampaignTriggerTypeEnum })}
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
							handleChange={(value) => updateCampaign({ gatilhoTempoPermanenciaMedida: value as TTimeDurationUnitsEnum })}
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
			{campaign.gatilhoTipo === "CASHBACK-ACUMULADO" ? (
				<div className="w-full flex flex-col gap-2 items-center lg:flex-row">
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="VALOR MÍNIMO DE NOVO CASHBACK ACUMULADO"
							value={campaign.gatilhoNovoCashbackAcumuladoValorMinimo ?? null}
							placeholder="Preencha aqui o valor mínimo de total cashback acumulado..."
							handleChange={(value) => updateCampaign({ gatilhoNovoCashbackAcumuladoValorMinimo: value })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="VALOR MÍNIMO DE TOTAL CASHBACK ACUMULADO"
							value={campaign.gatilhoTotalCashbackAcumuladoValorMinimo ?? null}
							placeholder="Preencha aqui o valor mínimo de total cashback acumulado..."
							handleChange={(value) => updateCampaign({ gatilhoTotalCashbackAcumuladoValorMinimo: value })}
							width="100%"
						/>
					</div>
				</div>
			) : null}
			{campaign.gatilhoTipo === "NOVA-COMPRA" ? (
				<NumberInput
					label="VALOR MÍNIMO DE NOVA COMPRA"
					value={campaign.gatilhoNovaCompraValorMinimo ?? null}
					placeholder="Preencha aqui o valor mínimo de nova compra..."
					handleChange={(value) => updateCampaign({ gatilhoNovaCompraValorMinimo: value })}
					width="100%"
				/>
			) : null}
			{campaign.gatilhoTipo === "QUANTIDADE-TOTAL-COMPRAS" ? (
				<NumberInput
					label="QUANTIDADE TOTAL DE COMPRAS (GATILHO)"
					value={campaign.gatilhoQuantidadeTotalCompras ?? null}
					placeholder="Ex: 2 para segunda compra, 3 para terceira compra..."
					handleChange={(value) => updateCampaign({ gatilhoQuantidadeTotalCompras: value })}
					width="100%"
				/>
			) : null}
			{campaign.gatilhoTipo === "VALOR-TOTAL-COMPRAS" ? (
				<NumberInput
					label="VALOR TOTAL DE COMPRAS (GATILHO)"
					value={campaign.gatilhoValorTotalCompras ?? null}
					placeholder="Ex: 1000 para disparar quando cliente atingir R$ 1.000 em compras..."
					handleChange={(value) => updateCampaign({ gatilhoValorTotalCompras: value })}
					width="100%"
				/>
			) : null}
		</ResponsiveMenuSection>
	);
}
