import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { createOrganizationMembershipInvitation } from "@/lib/mutations/organizations";
import { useOrganizationMembershipInvitationState } from "@/state-hooks/use-organization-membership-invitation-state";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import OrganizationsMembershipInvitationsGeneralBlock from "./Blocks/General";
import OrganizationsMembershipInvitationsPermissionsBlock from "./Blocks/Permissions";

type NewOrganizationMembershipInvitationProps = {
	sessionUserId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewOrganizationMembershipInvitation({ sessionUserId, closeModal, callbacks }: NewOrganizationMembershipInvitationProps) {
	const { state, updateInvitation, updateInvitationPermissions, resetState } = useOrganizationMembershipInvitationState();
	const [successInvitationId, setSuccessInvitationId] = useState<string | null>(null);

	const { mutate: handleCreateOrganizationMembershipInvitationMutation, isPending } = useMutation({
		mutationKey: ["create-organization-membership-invitation"],
		mutationFn: createOrganizationMembershipInvitation,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			setSuccessInvitationId(data.data.insertedId);
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});
	const handleResetToNewInvitation = () => {
		resetState();
		setSuccessInvitationId(null);
	};

	const successContent = successInvitationId ? (
		<div className="flex flex-col items-center text-center space-y-5 animate-in zoom-in duration-300">
			<div className="relative">
				<div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full scale-125 animate-pulse" />
				<div className="relative bg-green-600 p-6 rounded-full text-white shadow-xl shadow-green-600/20">
					<CheckCircle2 className="w-12 h-12" />
				</div>
			</div>
			<div className="space-y-1">
				<h3 className="text-2xl font-black uppercase tracking-tight text-green-700">CONVITE ENVIADO!</h3>
				<p className="text-muted-foreground font-bold text-sm">O usuário recebeu o convite por email.</p>
			</div>
			<Button onClick={handleResetToNewInvitation} size="lg" className="w-full rounded-2xl h-14 text-base font-black shadow-lg uppercase tracking-wider">
				NOVO CONVITE
			</Button>
		</div>
	) : null;

	return (
		<ResponsiveMenuV2
			menuTitle={successInvitationId ? "" : "NOVO CONVITE DE MEMBRO DA ORGANIZAÇÃO"}
			menuDescription={successInvitationId ? "" : "Preencha os campos abaixo para criar um novo convite de membro da organização"}
			menuActionButtonText="CRIAR CONVITE"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleCreateOrganizationMembershipInvitationMutation({ invitation: state.invitation })}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			successContent={successContent}
			dialogShowFooter={!successInvitationId}
			drawerShowFooter={!successInvitationId}
		>
			<OrganizationsMembershipInvitationsGeneralBlock invitation={state.invitation} updateInvitation={updateInvitation} />
			<OrganizationsMembershipInvitationsPermissionsBlock
				permissions={state.invitation.permissoes}
				updateInvitationPermissions={updateInvitationPermissions}
			/>
		</ResponsiveMenuV2>
	);
}
