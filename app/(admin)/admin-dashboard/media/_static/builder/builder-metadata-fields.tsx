"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/builder-metadata-fields.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updater no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import TextareaInput from "@/components/Inputs/TextareaInput";
import { STATIC_BUILDER_CAMPAIGN } from "../../_fixtures/campaign-builder";

/**
 * Description field used in the Settings stage. Title and ativo toggle live in
 * the persistent header (builder-header.tsx).
 */
export default function BuilderDescriptionField() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;
	return (
		<TextareaInput
			value={state.campaign.descricao ?? ""}
			label="DESCRIÇÃO"
			placeholder="Conte em poucas linhas o objetivo desta campanha (uso interno)..."
			handleChange={(value) => updateCampaign({ descricao: value })}
		/>
	);
}
