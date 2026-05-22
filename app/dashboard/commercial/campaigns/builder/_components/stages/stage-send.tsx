"use client";

import CampaignsActionBlock from "@/components/Modals/Campaigns/Blocks/Action";
import CampaignsExecutionBlock from "@/components/Modals/Campaigns/Blocks/Execution";
import { Send } from "lucide-react";
import type { TStageValidationResult } from "../../_helpers/validation";
import { useBuilderCampaign, useBuilderUi } from "../builder-provider";
import { StageShell } from "../stage-shell";

type StageSendProps = {
	organizationId: string;
	organizationName: string;
	organizationLogoUrl: string | null;
	validation: TStageValidationResult;
};

export default function StageSend({ organizationId, organizationName, organizationLogoUrl, validation }: StageSendProps) {
	const { back, next } = useBuilderUi();
	const { state, updateCampaign } = useBuilderCampaign();

	return (
		<StageShell>
			<StageShell.Title
				icon={Send}
				label="Envio"
				description="Configure o tempo de execução, remetente WhatsApp e template de mensagem."
			/>
			<StageShell.Body>
				<CampaignsExecutionBlock
					campaign={state.campaign}
					updateCampaign={updateCampaign}
					campaignSegmentations={state.segmentations}
				/>
				<CampaignsActionBlock
					organizationId={organizationId}
					organizationName={organizationName}
					organizationLogoUrl={organizationLogoUrl}
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
