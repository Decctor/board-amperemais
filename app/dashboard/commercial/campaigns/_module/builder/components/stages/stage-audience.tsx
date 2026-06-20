"use client";

import CampaignsFiltersBlock from "@/app/dashboard/commercial/campaigns/_module/shared/form/Blocks/Filters";
import { Filter } from "lucide-react";
import type { TStageValidationResult } from "../../helpers/validation";
import { useBuilderCampaign, useBuilderUi } from "../builder-provider";
import SegmentationsPanel from "../segmentations-panel";
import { StageShell } from "../stage-shell";

type StageAudienceProps = {
	validation: TStageValidationResult;
};

export default function StageAudience({ validation }: StageAudienceProps) {
	const { selectedCategory, back, next } = useBuilderUi();
	const {
		state,
		addFilterCondition,
		updateFilterCondition,
		addFilterGroup,
		updateFilterGroupOperator,
		removeFilterNode,
	} = useBuilderCampaign();
	const showSegmentations = selectedCategory !== "RFM";

	return (
		<StageShell>
			<StageShell.Title
				icon={Filter}
				label="Público"
				description={
					showSegmentations
						? "Use segmentações como filtro e refine a audiência com condições adicionais."
						: "Nas campanhas RFM, as segmentações são configuradas no gatilho. Aqui você pode adicionar filtros extras."
				}
			/>
			<StageShell.Body>
				{showSegmentations ? <SegmentationsPanel /> : null}
				<CampaignsFiltersBlock
					filtros={state.filtros}
					campaignSegmentations={state.segmentations}
					addFilterCondition={addFilterCondition}
					updateFilterCondition={updateFilterCondition}
					addFilterGroup={addFilterGroup}
					updateFilterGroupOperator={updateFilterGroupOperator}
					removeFilterNode={removeFilterNode}
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
