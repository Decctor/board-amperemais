"use client";

import type { TGetCampaignsOutputById } from "@/app/api/campaigns/route";
import { getCategoryFromTrigger } from "@/app/dashboard/commercial/campaigns/new/_helpers/categories";
import { SegmentationsField } from "@/app/dashboard/commercial/campaigns/new/_components/segmentations-panel";
import CampaignsFiltersBlock from "@/components/Modals/Campaigns/Blocks/Filters";
import SectionEditModal from "./SectionEditModal";

type EditAudienceSectionProps = {
	campaign: TGetCampaignsOutputById;
	closeModal: () => void;
	callbacks?: { onSuccess?: () => void; onSettled?: () => void };
};

export default function EditAudienceSection({ campaign, closeModal, callbacks }: EditAudienceSectionProps) {
	// On RFM campaigns the segmentations ARE the (read-only) trigger config, so we
	// only expose segmentation editing for the other categories — matching the wizard.
	const showSegmentations = getCategoryFromTrigger(campaign.gatilhoTipo) !== "RFM";

	return (
		<SectionEditModal
			campaign={campaign}
			menuTitle="EDITAR PÚBLICO"
			menuDescription={
				showSegmentations
					? "Use segmentações como filtro e refine a audiência com condições adicionais."
					: "Refine a audiência com filtros adicionais. As segmentações desta campanha são definidas pelo gatilho."
			}
			dialogVariant="lg"
			closeModal={closeModal}
			callbacks={callbacks}
		>
			{(controller) => (
				<>
					{showSegmentations ? <SegmentationsField controller={controller} /> : null}
					<CampaignsFiltersBlock
						filtros={controller.state.filtros}
						campaignSegmentations={controller.state.segmentations}
						addFilterCondition={controller.addFilterCondition}
						updateFilterCondition={controller.updateFilterCondition}
						addFilterGroup={controller.addFilterGroup}
						updateFilterGroupOperator={controller.updateFilterGroupOperator}
						updateFiltersRoot={controller.updateFiltersRoot}
						removeFilterNode={controller.removeFilterNode}
					/>
				</>
			)}
		</SectionEditModal>
	);
}
