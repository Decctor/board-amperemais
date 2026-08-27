"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/stages/stage-send.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem `useBuilderUi`/`useBuilderCampaign` e sem a validação
 * de etapa — estado vem da fixture, os botões de navegação são inertes.
 * `Execution` é importado do original (não tem hook); `Action` é cópia (duas queries + dois modais).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import CampaignsActionBlock from "../blocks/Action";
import CampaignsExecutionBlock from "@/app/dashboard/growth/campaigns/_module/shared/form/Blocks/Execution";
import { Send } from "lucide-react";
import { StageShell } from "@/app/dashboard/growth/campaigns/_module/builder/components/stage-shell";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

const noop = () => {};
const validation = { valid: true, reason: undefined } as { valid: boolean; reason?: string };

export default function StageSend() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;

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
				<CampaignsActionBlock campaign={state.campaign} updateCampaign={updateCampaign} />
			</StageShell.Body>
			<StageShell.Footer
				onBack={noop}
				onNext={noop}
				nextDisabled={!validation.valid}
				nextDisabledReason={validation.reason}
			/>
		</StageShell>
	);
}
