"use client";

import CampaignsActionBlock from "@/components/Modals/Campaigns/Blocks/Action";
import CampaignsExecutionBlock from "@/components/Modals/Campaigns/Blocks/Execution";
import { Send } from "lucide-react";
import type { TStageValidationResult } from "../../_helpers/validation";
import { useBuilderCampaign, useBuilderUi } from "../builder-provider";
import { StageShell } from "../stage-shell";

type StageSendProps = {
	organizationId: string;
	validation: TStageValidationResult;
};

export default function StageSend({ organizationId, validation }: StageSendProps) {
	const { back, next } = useBuilderUi();
	const { state, updateCampaign } = useBuilderCampaign();

	return (
		<StageShell>
			<StageShell.Title
				icon={Send}
				label="Envio"
				description="Configure o tempo de execução, telefone e template de WhatsApp."
			/>
			<StageShell.Body>
				<CampaignsExecutionBlock
					campaign={state.campaign}
					updateCampaign={updateCampaign}
					campaignSegmentations={state.segmentations}
				/>
				<CampaignsActionBlock
					organizationId={organizationId}
					campaign={state.campaign}
					updateCampaign={updateCampaign}
				/>
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
