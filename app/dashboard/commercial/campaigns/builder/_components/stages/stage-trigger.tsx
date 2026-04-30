"use client";

import { Sparkles } from "lucide-react";
import { getCategoryById } from "../../_helpers/categories";
import type { TStageValidationResult } from "../../_helpers/validation";
import { useBuilderCampaign, useBuilderUi } from "../builder-provider";
import CategoryPicker from "../category-picker";
import { StageShell } from "../stage-shell";
import TriggerPicker from "../trigger-picker";

type StageTriggerProps = {
	validation: TStageValidationResult;
};

export default function StageTrigger({ validation }: StageTriggerProps) {
	const { selectedCategory, transientPanel, next } = useBuilderUi();
	const { state } = useBuilderCampaign();
	const category = getCategoryById(selectedCategory);
	const triggerMatchesCategory = !!category && category.triggers.includes(state.campaign.gatilhoTipo);
	const triggerWasPicked = transientPanel === "inlineConfig";

	return (
		<StageShell>
			<StageShell.Title
				icon={Sparkles}
				label="Gatilho da campanha"
				description="Escolha primeiro a categoria e depois configure o gatilho que inicia a automação."
			/>
			<StageShell.Body>
				<CategoryPicker />
				{selectedCategory ? <TriggerPicker /> : null}
			</StageShell.Body>
			<StageShell.Footer
				canGoBack={false}
				onNext={next}
				nextDisabled={!selectedCategory || !triggerMatchesCategory || !triggerWasPicked || !validation.valid}
				nextDisabledReason={
					!selectedCategory
						? "Escolha uma categoria para continuar."
						: !triggerMatchesCategory || !triggerWasPicked
							? "Escolha um gatilho para continuar."
							: validation.reason
				}
			/>
		</StageShell>
	);
}
