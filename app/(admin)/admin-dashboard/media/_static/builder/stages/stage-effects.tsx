"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/stages/stage-effects.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem `useBuilderUi`/`useBuilderCampaign` e sem a validação
 * de etapa — estado vem da fixture, os botões de navegação são inertes.
 * `CashbackGeneration` é importado do original (não tem hook); `CouponGeneration` é cópia (tem `useCoupons`).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import CampaignsCashbackGenerationBlock from "@/app/dashboard/growth/campaigns/_module/shared/form/Blocks/CashbackGeneration";
import CampaignsCouponGenerationBlock from "../blocks/CouponGeneration";
import { CalendarRange } from "lucide-react";
import { StageShell } from "@/app/dashboard/growth/campaigns/_module/builder/components/stage-shell";
import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";

const noop = () => {};
const validation = { valid: true, reason: undefined } as { valid: boolean; reason?: string };

export default function StageEffects() {
	const { state, updateCampaign } = STATIC_BUILDER_CAMPAIGN;

	return (
		<StageShell>
			<StageShell.Title
				icon={CalendarRange}
				label="Efeitos"
				description="Defina se a campanha gera cashback e/ou atribui cupons, e quais regras serão usadas."
			/>
			<StageShell.Body>
				<CampaignsCashbackGenerationBlock campaign={state.campaign} updateCampaign={updateCampaign} />
				<CampaignsCouponGenerationBlock campaign={state.campaign} updateCampaign={updateCampaign} />
			</StageShell.Body>
			<StageShell.Footer onBack={noop} onNext={noop} nextDisabled={!validation.valid} nextDisabledReason={validation.reason} />
		</StageShell>
	);
}
