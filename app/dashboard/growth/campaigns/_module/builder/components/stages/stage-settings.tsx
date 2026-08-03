"use client";

import CampaignsConfigBlock from "@/app/dashboard/growth/campaigns/_module/shared/form/Blocks/Config";
// import CampaignsConversionBlock from "@/app/dashboard/growth/campaigns/_module/shared/form/Blocks/Conversion";
import { Settings2 } from "lucide-react";
import type { TStageValidationResult } from "../../helpers/validation";
import { useBuilderCampaign, useBuilderUi } from "../builder-provider";
import BuilderDescriptionField from "../builder-metadata-fields";
import { StageShell } from "../stage-shell";

type StageSettingsProps = {
	validation: TStageValidationResult;
};

export default function StageSettings({ validation }: StageSettingsProps) {
	const { back, next } = useBuilderUi();
	const { state, updateCampaign } = useBuilderCampaign();

	return (
		<StageShell>
			<StageShell.Title icon={Settings2} label="Ajustes" description="Configure limites, recorrência, atribuição de conversão e descrição interna." />
			<StageShell.Body>
				<BuilderDescriptionField />
				<CampaignsConfigBlock campaign={state.campaign} updateCampaign={updateCampaign} />
				{/* <CampaignsConversionBlock campaign={state.campaign} updateCampaign={updateCampaign} /> */}
			</StageShell.Body>
			<StageShell.Footer onBack={back} onNext={next} nextDisabled={!validation.valid} nextDisabledReason={validation.reason} />
		</StageShell>
	);
}
