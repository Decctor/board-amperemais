"use client";

import type { TGetCampaignsOutputById } from "@/app/api/campaigns/route";
import { validateStage } from "@/app/dashboard/commercial/campaigns/new/_helpers/validation";
import CampaignsCashbackGenerationBlock from "@/components/Modals/Campaigns/Blocks/CashbackGeneration";
import SectionEditModal from "./SectionEditModal";

type EditEffectsSectionProps = {
	campaign: TGetCampaignsOutputById;
	closeModal: () => void;
	callbacks?: { onSuccess?: () => void; onSettled?: () => void };
};

export default function EditEffectsSection({ campaign, closeModal, callbacks }: EditEffectsSectionProps) {
	return (
		<SectionEditModal
			campaign={campaign}
			menuTitle="EDITAR EFEITOS"
			menuDescription="Defina se a campanha gera cashback e quais regras serão aplicadas."
			dialogVariant="md"
			validate={(state) => validateStage("effects", state.campaign, state.segmentations)}
			closeModal={closeModal}
			callbacks={callbacks}
		>
			{({ state, updateCampaign }) => <CampaignsCashbackGenerationBlock campaign={state.campaign} updateCampaign={updateCampaign} />}
		</SectionEditModal>
	);
}
