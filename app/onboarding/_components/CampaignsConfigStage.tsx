import { getAvailableCampaignPresets, type TOnboardingCampaignPresetKey } from "@/config/onboarding-campaign-presets";
import { getOnboardingTemplatePreview } from "@/config/onboarding-message-templates";
import { cn } from "@/lib/utils";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { Check, Clock, MessageSquareText } from "lucide-react";

type CampaignsConfigStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	toggleCampaign: TUseOrganizationOnboardingState["toggleCampaign"];
};

export function CampaignsConfigStage({ state, toggleCampaign }: CampaignsConfigStageProps) {
	const cashbackAtivo = state.cashback.ativo;
	const variant = cashbackAtivo ? "COM_CASHBACK" : "SEM_CASHBACK";
	const presets = getAvailableCampaignPresets(cashbackAtivo);

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-muted-foreground tracking-tight">
				Selecione as automações que vão rodar no piloto automático. Elas já vêm com mensagens prontas
				{cashbackAtivo ? " e com a oferta de cashback incluída" : ", sem menção a cashback"}. Você ajusta tudo depois quando quiser.
			</p>

			<div className="flex flex-col gap-2.5">
				{presets.map((preset) => {
					const selected = state.selectedCampaignKeys.includes(preset.key);
					const preview = getOnboardingTemplatePreview(preset.templateKey, variant);
					return (
						<button
							type="button"
							key={preset.key}
							onClick={() => toggleCampaign(preset.key as TOnboardingCampaignPresetKey)}
							className={cn(
								"flex flex-col gap-2.5 rounded-2xl border-2 p-4 text-left transition-all duration-200",
								selected ? "border-[#24549C] bg-[#24549C]/[0.04] shadow-sm" : "border-gray-100 bg-white hover:border-[#24549C]/40",
							)}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex flex-col gap-0.5">
									<span className="font-bold text-gray-900 tracking-tight">{preset.titulo}</span>
									<span className="text-sm text-muted-foreground leading-snug">{preset.descricao}</span>
								</div>
								<span
									className={cn(
										"flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
										selected ? "border-[#24549C] bg-[#24549C] text-white" : "border-gray-200 bg-white",
									)}
								>
									{selected && <Check className="h-3.5 w-3.5 stroke-[3px]" />}
								</span>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<span className="inline-flex items-center gap-1 rounded-full bg-[#24549C]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#24549C]">
									<Clock className="h-3 w-3" />
									{preset.gatilhoLabel}
								</span>
								{preset.requiresCashback && (
									<span className="rounded-full bg-[#FFB900]/18 px-2.5 py-0.5 text-[11px] font-bold text-yellow-700">Usa cashback</span>
								)}
							</div>
							{preview && (
								<div className="flex items-start gap-2 rounded-xl bg-superficie/70 p-3">
									<MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
									<p className="text-sm leading-relaxed text-gray-600">{preview}</p>
								</div>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
