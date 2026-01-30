import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseOrganizationMembershipInvitationState } from "@/state-hooks/use-organization-membership-invitation-state";
import { LayoutGrid } from "lucide-react";

type OrganizationsMembershipInvitationsGeneralBlockProps = {
	invitation: TUseOrganizationMembershipInvitationState["state"]["invitation"];
	updateInvitation: TUseOrganizationMembershipInvitationState["updateInvitation"];
};

export default function OrganizationsMembershipInvitationsGeneralBlock({
	invitation,
	updateInvitation,
}: OrganizationsMembershipInvitationsGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<TextInput
				value={invitation.nome}
				label="NOME"
				placeholder="Preencha aqui o nome do usuário que será convidado."
				handleChange={(value) => updateInvitation({ nome: value })}
			/>
			<TextInput
				value={invitation.email}
				label="EMAIL"
				placeholder="Preencha aqui o email do usuário que será convidado."
				handleChange={(value) => updateInvitation({ email: value })}
			/>
		</ResponsiveMenuSection>
	);
}
