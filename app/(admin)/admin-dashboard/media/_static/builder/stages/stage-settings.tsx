"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/stages/stage-settings.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem `useBuilderUi`/`useBuilderCampaign` e sem a validação
 * de etapa — estado vem da fixture, os botões de navegação são inertes.
 * `Config` é importado do original — só tem um `useMemo` de derivação, nada de dados.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import CampaignsConfigBlock from "@/app/dashboard/growth/campaigns/_module/shared/form/Blocks/Config";
// import CampaignsConversionBlock from "@/app/dashboard/growth/campaigns/_module/shared/form/Blocks/Conversion";
import { Settings2 } from "lucide-react";
import BuilderDescriptionField from "../builder-metadata-fields";
import { StageShell } from "@/app/dashboard/growth/campaigns/_module/builder/components/stage-shell";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

const noop = () => {};
const validation = { valid: true, reason: undefined } as { valid: boolean; reason?: string };

export default function StageSettings() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;

	return (
		<StageShell>
			<StageShell.Title icon={Settings2} label="Ajustes" description="Configure limites, recorrência, atribuição de conversão e descrição interna." />
			<StageShell.Body>
				<BuilderDescriptionField />
				<CampaignsConfigBlock campaign={state.campaign} updateCampaign={updateCampaign} />
				{/* <CampaignsConversionBlock campaign={state.campaign} updateCampaign={updateCampaign} /> */}
			</StageShell.Body>
			<StageShell.Footer onBack={noop} onNext={noop} nextDisabled={!validation.valid} nextDisabledReason={validation.reason} />
		</StageShell>
	);
}
