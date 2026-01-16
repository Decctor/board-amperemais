import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { OrganizationNicheOptions } from "@/utils/select-options";
import { Hammer, HelpCircle, Shirt, SprayCan, TargetIcon, Utensils } from "lucide-react";
import { FaGoogle, FaInstagram, FaLinkedin, FaUserGroup, FaYoutube } from "react-icons/fa6";
import { SelectableCard } from "./SelectableCard";

type NicheOriginStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	updateOrganization: TUseOrganizationOnboardingState["updateOrganization"];
};

const NICHE_ICONS: Record<string, React.ReactNode> = {
	ALIMENTAÇÃO: <Utensils />,
	CONSTRUÇÃO: <Hammer />,
	MODA: <Shirt />,
	PERFUMARIA: <SprayCan />,
};

const ORIGIN_OPTIONS = [
	{ id: "instagram", label: "INSTAGRAM", icon: <FaInstagram /> },
	{ id: "linkedin", label: "LinkedIn", icon: <FaLinkedin /> },
	{ id: "youtube", label: "YouTube", icon: <FaYoutube /> },
	{ id: "google", label: "Google", icon: <FaGoogle /> },
	{ id: "indicacao", label: "Indicação", icon: <FaUserGroup /> },
	{ id: "outro", label: "Outro", icon: <HelpCircle /> },
];

export function NicheOriginStage({ state, updateOrganization }: NicheOriginStageProps) {
	return (
		<div className="w-full flex flex-col gap-6">
			<div className="w-full flex flex-col gap-3">
				<h3 className="text-lg font-medium tracking-tight">Qual o nicho de atuação da sua empresa?</h3>
				<div className="w-full flex flex-wrap gap-x-4 gap-y-2">
					{OrganizationNicheOptions.map((niche) => (
						<SelectableCard
							key={niche.id}
							label={niche.label}
							icon={NICHE_ICONS[niche.value] || <HelpCircle />}
							selected={state.organization.atuacaoNicho === niche.value}
							onSelect={() => updateOrganization({ atuacaoNicho: niche.value })}
							className="w-36 h-36"
						/>
					))}
				</div>
			</div>

			<div className="w-full flex flex-col gap-3">
				<h3 className="text-lg font-medium tracking-tight">Como você conheceu a RecompraCRM?</h3>
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
					{ORIGIN_OPTIONS.map((origin) => (
						<SelectableCard
							key={origin.id}
							label={origin.label}
							icon={origin.icon}
							selected={state.organization.origemLead === origin.label.toUpperCase()}
							onSelect={() => updateOrganization({ origemLead: origin.label.toUpperCase() })}
							className="w-36 h-36"
						/>
					))}
				</div>
			</div>
		</div>
	);
}
