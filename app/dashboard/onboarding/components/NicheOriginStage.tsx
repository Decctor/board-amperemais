import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { OrganizationNicheOptions } from "@/utils/select-options";
import { Hammer, HelpCircle, Shirt, SprayCan, Utensils } from "lucide-react";
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
	{ id: "instagram", label: "Instagram", icon: <FaInstagram /> },
	{ id: "linkedin", label: "LinkedIn", icon: <FaLinkedin /> },
	{ id: "youtube", label: "YouTube", icon: <FaYoutube /> },
	{ id: "google", label: "Google", icon: <FaGoogle /> },
	{ id: "indicacao", label: "Indicação", icon: <FaUserGroup /> },
	{ id: "outro", label: "Outro", icon: <HelpCircle /> },
];

export function NicheOriginStage({ state, updateOrganization }: NicheOriginStageProps) {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-4">
				<h3 className="font-semibold text-lg">Qual o nicho de atuação da sua empresa?</h3>
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					{OrganizationNicheOptions.map((niche) => (
						<SelectableCard
							key={niche.id}
							label={niche.label}
							icon={NICHE_ICONS[niche.value] || <HelpCircle />}
							selected={state.organization.atuacaoNicho === niche.value}
							onSelect={() => updateOrganization({ atuacaoNicho: niche.value })}
						/>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<h3 className="font-semibold text-lg">Como você conheceu a RecompraCRM?</h3>
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
					{ORIGIN_OPTIONS.map((origin) => (
						<SelectableCard
							key={origin.id}
							label={origin.label}
							icon={origin.icon}
							selected={state.organization.origemLead === origin.label.toUpperCase()}
							onSelect={() => updateOrganization({ origemLead: origin.label.toUpperCase() })}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
