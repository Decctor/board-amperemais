"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/stages/stage-audience.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem `useBuilderUi`/`useBuilderCampaign` e sem a validação
 * de etapa — estado vem da fixture, os botões de navegação são inertes.
 * A categoria chega por prop porque ela decide se o painel de segmentações aparece.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import CampaignsFiltersBlock from "../blocks/Filters";
import type { TBuilderCategoryId } from "@/app/dashboard/growth/campaigns/_module/builder/helpers/categories";
import { Filter } from "lucide-react";
import SegmentationsPanel from "../segmentations-panel";
import { StageShell } from "@/app/dashboard/growth/campaigns/_module/builder/components/stage-shell";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

type StageAudienceProps = {
	selectedCategory: TBuilderCategoryId;
};

const noop = () => {};
const validation = { valid: true, reason: undefined } as { valid: boolean; reason?: string };

export default function StageAudience({ selectedCategory }: StageAudienceProps) {
	const { state } = STATIC_BUILDER_CAMPAIGN;
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
				<CampaignsFiltersBlock filtros={state.filtros} />
			</StageShell.Body>
			<StageShell.Footer
				onBack={noop}
				onNext={noop}
				nextDisabled={!validation.valid}
				nextDisabledReason={validation.reason}
			/>
		</StageShell>
	);
}
