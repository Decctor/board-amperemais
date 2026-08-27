"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/stages/stage-trigger.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem `useBuilderUi`/`useBuilderCampaign` e sem a validação
 * de etapa — estado vem da fixture, os botões de navegação são inertes.
 * `panel` escolhe entre a grade de gatilhos e o gatilho já configurado — as duas peças rendem prints diferentes.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import { Sparkles } from "lucide-react";
import { getCategoryById, type TBuilderCategoryId } from "@/app/dashboard/growth/campaigns/_module/builder/helpers/categories";
import CategoryPicker from "../category-picker";
import { StageShell } from "@/app/dashboard/growth/campaigns/_module/builder/components/stage-shell";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";
import TriggerPicker from "../trigger-picker";

type StageTriggerProps = {
	selectedCategory: TBuilderCategoryId;
	/** "grid" mostra a grade de gatilhos; "inlineConfig" mostra o gatilho já escolhido. */
	panel: "grid" | "inlineConfig";
};

const noop = () => {};
const validation = { valid: true, reason: undefined } as { valid: boolean; reason?: string };

export default function StageTrigger({ selectedCategory, panel }: StageTriggerProps) {
	const { state } = STATIC_BUILDER_CAMPAIGN;
	const category = getCategoryById(selectedCategory);
	const triggerMatchesCategory = !!category && category.triggers.includes(state.campaign.gatilhoTipo);
	const triggerWasPicked = panel === "inlineConfig";

	return (
		<StageShell>
			<StageShell.Title
				icon={Sparkles}
				label="Gatilho da campanha"
				description="Escolha primeiro a categoria e depois configure o gatilho que inicia a automação."
			/>
			<StageShell.Body>
				<CategoryPicker selectedCategory={selectedCategory} />
				<TriggerPicker selectedCategory={selectedCategory} panel={panel} />
			</StageShell.Body>
			<StageShell.Footer
				canGoBack={false}
				onNext={noop}
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
