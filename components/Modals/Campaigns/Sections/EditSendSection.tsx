"use client";

import type { TGetCampaignsOutputById } from "@/app/api/campaigns/route";
import { validateStage } from "@/app/dashboard/commercial/campaigns/new/_helpers/validation";
import CampaignsActionBlock from "@/components/Modals/Campaigns/Blocks/Action";
import CampaignsExecutionBlock from "@/components/Modals/Campaigns/Blocks/Execution";
import SectionEditModal from "./SectionEditModal";

type EditSendSectionProps = {
	campaign: TGetCampaignsOutputById;
	organizationId: string;
	organizationName: string;
	organizationLogoUrl: string | null;
	closeModal: () => void;
	callbacks?: { onSuccess?: () => void; onSettled?: () => void };
};

export default function EditSendSection({
	campaign,
	organizationId,
	organizationName,
	organizationLogoUrl,
	closeModal,
	callbacks,
}: EditSendSectionProps) {
	return (
		<SectionEditModal
			campaign={campaign}
			menuTitle="EDITAR MENSAGEM & ENVIO"
			menuDescription="Ajuste o tempo de execução, o remetente do WhatsApp e o template de mensagem."
			dialogVariant="lg"
			validate={(state) => validateStage("send", state.campaign, state.segmentations)}
			closeModal={closeModal}
			callbacks={callbacks}
		>
			{({ state, updateCampaign }) => (
				<>
					<CampaignsExecutionBlock campaign={state.campaign} updateCampaign={updateCampaign} campaignSegmentations={state.segmentations} />
					<CampaignsActionBlock
						organizationId={organizationId}
						organizationName={organizationName}
						organizationLogoUrl={organizationLogoUrl}
						campaign={state.campaign}
						updateCampaign={updateCampaign}
					/>
				</>
			)}
		</SectionEditModal>
	);
}
