"use client";

import type { TGetCampaignsOutputById } from "@/app/api/campaigns/route";
import { validateStage } from "@/app/dashboard/commercial/campaigns/new/_helpers/validation";
import CampaignsConfigBlock from "@/components/Modals/Campaigns/Blocks/Config";
import CampaignsConversionBlock from "@/components/Modals/Campaigns/Blocks/Conversion";
import SectionEditModal from "./SectionEditModal";

type EditSettingsSectionProps = {
	campaign: TGetCampaignsOutputById;
	closeModal: () => void;
	callbacks?: { onSuccess?: () => void; onSettled?: () => void };
};

export default function EditSettingsSection({ campaign, closeModal, callbacks }: EditSettingsSectionProps) {
	return (
		<SectionEditModal
			campaign={campaign}
			menuTitle="EDITAR CONVERSÃO & AJUSTES"
			menuDescription="Defina atribuição de conversão, recorrência por cliente e limites de envio da campanha."
			dialogVariant="md"
			validate={(state) => validateStage("settings", state.campaign, state.segmentations)}
			closeModal={closeModal}
			callbacks={callbacks}
		>
			{({ state, updateCampaign }) => (
				<>
					<CampaignsConversionBlock campaign={state.campaign} updateCampaign={updateCampaign} />
					<CampaignsConfigBlock campaign={state.campaign} updateCampaign={updateCampaign} />
				</>
			)}
		</SectionEditModal>
	);
}
