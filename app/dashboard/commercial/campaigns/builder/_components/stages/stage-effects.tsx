"use client";

import CampaignsCashbackGenerationBlock from "@/components/Modals/Campaigns/Blocks/CashbackGeneration";
import { CalendarRange } from "lucide-react";
import type { TStageValidationResult } from "../../_helpers/validation";
import { useBuilderCampaign, useBuilderUi } from "../builder-provider";
import { StageShell } from "../stage-shell";

type StageEffectsProps = {
	validation: TStageValidationResult;
};

export default function StageEffects({ validation }: StageEffectsProps) {
	const { back, next } = useBuilderUi();
	const { state, updateCampaign } = useBuilderCampaign();

	return (
		<StageShell>
			<StageShell.Title
				icon={CalendarRange}
				label="Efeitos"
				description="Defina se a campanha gera cashback e quais regras serão usadas."
			/>
			<StageShell.Body>
				<CampaignsCashbackGenerationBlock campaign={state.campaign} updateCampaign={updateCampaign} />
			</StageShell.Body>
			<StageShell.Footer
				onBack={back}
				onNext={next}
				nextDisabled={!validation.valid}
				nextDisabledReason={validation.reason}
			/>
		</StageShell>
	);
}
