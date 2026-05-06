"use client";

import TextareaInput from "@/components/Inputs/TextareaInput";
import { useBuilderCampaign } from "./builder-provider";

/**
 * Description field used in the Settings stage. Title and ativo toggle live in
 * the persistent header (builder-header.tsx).
 */
export default function BuilderDescriptionField() {
	const { state, updateCampaign } = useBuilderCampaign();
	return (
		<TextareaInput
			value={state.campaign.descricao ?? ""}
			label="DESCRIÇÃO"
			placeholder="Conte em poucas linhas o objetivo desta campanha (uso interno)..."
			handleChange={(value) => updateCampaign({ descricao: value })}
		/>
	);
}
