import type { TOrganizationMembershipInvitationState } from "@/schemas/organizations";
import { useCallback, useState } from "react";

export function useOrganizationMembershipInvitationState() {
	const initialState: TOrganizationMembershipInvitationState = {
		invitation: {
			nome: "",
			email: "",
			permissoes: {
				empresa: {
					visualizar: true,
					editar: false,
				},
				resultados: {
					visualizar: true,
					criarMetas: true,
					visualizarMetas: true,
					editarMetas: true,
					excluirMetas: true,
					escopo: [],
				},
				usuarios: {
					visualizar: true,
					criar: true,
					editar: true,
					excluir: true,
				},
				atendimentos: {
					visualizar: true,
					iniciar: true,
					responder: true,
					finalizar: true,
				},
			},
		},
	};

	const [state, setState] = useState<TOrganizationMembershipInvitationState>(initialState);

	const updateInvitation = useCallback((invitation: Partial<TOrganizationMembershipInvitationState["invitation"]>) => {
		setState((prev) => ({
			...prev,
			invitation: { ...prev.invitation, ...invitation },
		}));
	}, []);

	const updateInvitationPermissions = useCallback((permissoes: Partial<TOrganizationMembershipInvitationState["invitation"]["permissoes"]>) => {
		setState((prev) => ({
			...prev,
			invitation: { ...prev.invitation, permissoes: { ...prev.invitation.permissoes, ...permissoes } },
		}));
	}, []);

	const resetState = useCallback(() => {
		setState(initialState);
	}, [initialState]);

	const redefineState = useCallback((state: TOrganizationMembershipInvitationState) => {
		setState(state);
	}, []);

	return {
		state,
		updateInvitation,
		updateInvitationPermissions,
		resetState,
		redefineState,
	};
}
export type TUseOrganizationMembershipInvitationState = ReturnType<typeof useOrganizationMembershipInvitationState>;
